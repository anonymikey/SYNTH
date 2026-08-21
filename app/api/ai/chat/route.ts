import { NextResponse } from "next/server";
import { parseEngineRequest } from "@/lib/ai/request-schema";
import { getSynthEngine } from "@/lib/ai/server";
import { toSseResponse } from "@/lib/transport/stream-response";
import { resolveSynthModel } from "@/lib/ai/synth-models";
import type { EngineEvent } from "@/engine/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = parseEngineRequest(await request.json());

    // SYNTH Model Resolution: resolve SYNTH model IDs to internal provider/model selections.
    // The browser sends SYNTH model IDs (synth-ultra, synth-code, etc.).
    // The server resolves them to actual provider + model selections.
    // Legacy raw model IDs are also normalized server-side for backward compatibility.
    if (input.model) {
      try {
        const selection = resolveSynthModel(input.model);
        input.provider = selection;
      } catch {
        // Unknown model — let the engine handle the error with a clear message
      }
    }

    const engine = getSynthEngine();

    // If this is an initial explicit toolRequest (no toolApproval token), run the engine
    // and capture the first relevant event. Return JSON with approval info instead of SSE.
    if (input.toolRequest && !input.toolApproval) {
      const events = engine.run({ ...input, signal: request.signal });
      for await (const ev of events as AsyncIterable<EngineEvent>) {
        if (request.signal?.aborted) break;
        if (ev.type === "approval-required") {
          return NextResponse.json({ approvalRequired: true, requestId: ev.requestId, approvalToken: ev.approvalToken, call: ev.call });
        }
        if (ev.type === "failed") {
          return NextResponse.json({ error: ev.error?.message ?? "Engine failed" }, { status: 400 });
        }
        if (ev.type === "tool-result") {
          return NextResponse.json({ approvalRequired: false, requestId: ev.requestId, result: ev.result });
        }
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
          if (ev.type === "failed") {
            const msg = ev.error?.message ?? "Engine failed";
            const lower = String(msg).toLowerCase();
            const status = lower.includes("expired") || lower.includes("already_consumed") || lower.includes("not_found") ? 410 : 403;
            return NextResponse.json({ error: msg }, { status });
          }
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for (const e of buffer) {
                  if (request.signal?.aborted) break;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
                }
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
      }
      return NextResponse.json({ error: "No decisive event produced by engine." }, { status: 500 });
    }

    // For non-tool continuations/other requests, stream SSE as before.
    return toSseResponse(engine.run({ ...input, signal: request.signal }), request.signal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid SYNTH Engine request." }, { status: 400 });
  }
}
