import { NextResponse } from "next/server";
import { serverAi } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const ollamaModels = await serverAi.ollama.listModels();
  const models = ollamaModels.length ? ollamaModels : await serverAi.mock.listModels();
  return NextResponse.json({ models });
}
