import { NextResponse } from "next/server";
import { getRepositoryAdapter } from "@/lib/project/adapter-factory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/project/search?q=<query>&limit=<max> — searches project files */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 50);

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [], query: query ?? "" });
    }

    const adapter = await getRepositoryAdapter();
    const results = await adapter.searchFiles(query, limit);
    return NextResponse.json({ results, query, adapterType: adapter.type });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
