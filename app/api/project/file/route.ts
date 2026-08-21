import { NextResponse } from "next/server";
import { getRepositoryAdapter } from "@/lib/project/adapter-factory";
import { validatePath } from "@/lib/project/file-safety";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/project/file?path=<relativePath> — reads file content */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json({ error: "Missing required 'path' parameter" }, { status: 400 });
    }

    // Server-side path validation
    const validation = validatePath(filePath);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }

    const adapter = await getRepositoryAdapter();
    const file = await adapter.readFile(filePath);
    return NextResponse.json({ file, adapterType: adapter.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read file";
    const status = message.includes("not found") ? 404 : message.includes("denied") || message.includes("restricted") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
