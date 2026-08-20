import { NextResponse } from "next/server";
import { serverAi } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await Promise.all(serverAi.registry.list().map((provider) => provider.healthCheck()));
  return NextResponse.json({ providers, configured: { openrouter: Boolean(process.env.OPENROUTER_API_KEY) } });
}
