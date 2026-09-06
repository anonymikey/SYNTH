import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/app", url.origin);
  destination.searchParams.set("github", url.searchParams.has("error") ? "error" : "connected");
  return NextResponse.redirect(destination);
}
