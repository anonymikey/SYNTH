import { NextResponse } from "next/server";
import { parseEngineRequest } from "@/lib/ai/request-schema";
import { getSynthEngine } from "@/lib/ai/server";
import { toSseResponse } from "@/lib/transport/stream-response";
import type { EngineEvent } from "@/engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = parseEngineRequest(await request.json());
    const engine = getSynthEngine();

    // If this is an initial explicit toolRequest (no toolApproval token), run the engine
    // and capture the first relevant event. Return JSON with approval info instead of SSE.
    if (input.toolRequest && !input.toolApproval) {
      const events = engine.run({ ...input, signal: request.signal });
      for await (const ev of events as AsyncIterable<EngineEvent>) {
        if (request.signal?.aborted) break;
        if (ev.type === "approval-required") {
          // Do not expose internal server state beyond the opaque approval token and the call info
          // ev is typed as EngineEvent so TS knows the shape
          return NextResponse.json({ approvalRequired: true, requestId: ev.requestId, approvalToken: ev.approvalToken, call: ev.call });
        }
        if (ev.type === "failed") {
          return NextResponse.json({ error: ev.error?.message ?? "Engine failed" }, { status: 400 });
        }
        if (ev.type === "tool-result") {
          // In the unlikely case the engine executed immediately, return the result
          return NextResponse.json({ approvalRequired: false, requestId: ev.requestId, result: ev.result });
        }
        // ignore other events and continue until we find a decisive one
      }
      return NextResponse.json({ error: "No approval event produced by engine." }, { status: 500 });
    }

    // If this is a continuation (toolApproval present), run the engine enough to determine if the token is invalid/expired/replayed.
    if (input.toolApproval) {
      const events = engine.run({ ...input, signal: request.signal });
      const iterator = (events as AsyncIterable<EngineEvent>)[Symbol.asyncIterator]();
      const buffer: EngineEvent[] = [];
      while (true) {
        const next = await iterator.next();
        if (next.done) break;
        const ev = next.value;
        buffer.push(ev);
        if (ev.type === "failed" || ev.type === "tool-result") {
          // decisive
          if (ev.type === "failed") {
            const msg = ev.error?.message ?? "Engine failed";
            // Determine status: expired/replayed -> 410, authorization -> 403
            const lower = String(msg).toLowerCase();
            const status = lower.includes("expired") || lower.includes("already_consumed") || lower.includes("not_found") ? 410 : 403;
            return NextResponse.json({ error: msg }, { status });
          }
          // ev.type === 'tool-result' -> stream: first send buffered events then continue streaming remaining events
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for (const e of buffer) {
                  if (request.signal?.aborted) break;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
                }
                // continue streaming remaining events from the iterator
                while (true) {
                  const n = await iterator.next();
                  if (n.done) break;
                  if (request.signal?.aborted) break;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(n.value)}\n\n`));
                }
                controller.close();
              } catch (err) {
                controller.error(err);
              }
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
        }
        // otherwise keep buffering
      }
      return NextResponse.json({ error: "No decisive event produced by engine." }, { status: 500 });
    }

    // For non-tool continuations/other requests, stream SSE as before.
    return toSseResponse(engine.run({ ...input, signal: request.signal }), request.signal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid SYNTH Engine request." }, { status: 400 });
  }
}
