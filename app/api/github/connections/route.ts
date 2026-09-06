import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const { data, error } = await supabase
    .from("github_connections")
    .select("id, provider_account_id, provider_login, provider_avatar_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Unable to load GitHub connections" }, { status: 500 });
  return NextResponse.json({ connections: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Connection id is required" }, { status: 400 });

  const { error } = await supabase.from("github_connections").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Unable to disconnect GitHub" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
