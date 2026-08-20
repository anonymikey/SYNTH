import { NextResponse } from "next/server";
import { serverAi } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [openRouterModels, ollamaModels, mockModels] = await Promise.all([serverAi.openrouter.listModels(), serverAi.ollama.listModels(), serverAi.mock.listModels()]);
  return NextResponse.json({ models: [...openRouterModels, ...ollamaModels, ...mockModels] });
}
