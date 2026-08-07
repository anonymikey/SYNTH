import { NextResponse } from "next/server";
import { parseEngineRequest } from "@/lib/ai/request-schema";
import { getSynthEngine } from "@/lib/ai/server";
import { toSseResponse } from "@/lib/transport/stream-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const input = parseEngineRequest(await request.json());
    const engine = getSynthEngine();
    return toSseResponse(engine.run({ ...input, signal: request.signal }), request.signal);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid SYNTH Engine request." }, { status: 400 });
  }
}
