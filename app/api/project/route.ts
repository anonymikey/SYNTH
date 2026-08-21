import { NextResponse } from "next/server";
import { getRepositoryAdapter } from "@/lib/project/adapter-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/project — returns project metadata */
export async function GET() {
  try {
    const adapter = await getRepositoryAdapter();
    const project = await adapter.getProject();
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load project" },
      { status: 500 }
    );
  }
}
