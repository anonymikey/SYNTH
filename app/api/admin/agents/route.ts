import { NextResponse } from "next/server";
import { AgentRegistry } from "@/agents/registry";
import { hasAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await hasAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ agents: AgentRegistry.list().map(({ id, label, displayName, division, version, source, enabled, modelPolicy, capabilities, permissions, memoryPolicy }) => ({ id, label, displayName, division, version, source, enabled, modelPolicy, capabilities, permissions, memoryPolicy })) });
  } catch {
    return NextResponse.json({ error: "Unable to load administrator agents." }, { status: 500 });
  }
}
