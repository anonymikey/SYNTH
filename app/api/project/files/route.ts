import { NextResponse } from "next/server";
import { getRepositoryAdapter } from "@/lib/project/adapter-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/project/files?path=<relativePath> — lists files at a path */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get("path") ?? undefined;

    const adapter = await getRepositoryAdapter();
    const files = await adapter.listFiles(relativePath ?? undefined);
    return NextResponse.json({ files, adapterType: adapter.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list files" },
      { status: 500 }
    );
  }
}
