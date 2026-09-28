import { NextResponse } from "next/server";
import { serverAi } from "@/lib/ai/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const providers = await Promise.all(serverAi.registry.list().map((provider) => provider.healthCheck()));
  const connected = providers.some((provider) => provider.status === "connected");

  // Keep provider names, model IDs, and credential configuration server-only.
  return NextResponse.json({ status: connected ? "ok" : "degraded" });
}
