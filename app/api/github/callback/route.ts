import { NextResponse } from "next/server";
import { getToken } from "@vercel/connect";
import { createClient } from "@/lib/supabase/server";

const GITHUB_CONNECTOR = "scl_hxS8siXfDuPj12BQjC1A";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destination = new URL("/app", url.origin);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || url.searchParams.has("error")) {
    destination.searchParams.set("github", "error");
    return NextResponse.redirect(destination);
  }

  try {
    const token = await getToken(GITHUB_CONNECTOR, { subject: { type: "user", id: user.id } });
    const response = await fetch("https://api.github.com/user", {
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "User-Agent": "SYNTH" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("GitHub profile lookup failed");
    const profile = await response.json() as { id: number; login: string; avatar_url?: string };
    const { error } = await supabase.from("github_connections").upsert({
      user_id: user.id,
      provider_account_id: String(profile.id),
      provider_login: profile.login,
      provider_avatar_url: profile.avatar_url ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider_account_id" });
    if (error) throw error;
    destination.searchParams.set("github", "connected");
  } catch {
    destination.searchParams.set("github", "error");
  }
  return NextResponse.redirect(destination);
}
