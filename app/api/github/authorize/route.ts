import { NextResponse } from "next/server";
import { startAuthorization } from "@vercel/connect";
import { createClient } from "@/lib/supabase/server";

const GITHUB_CONNECTOR = "scl_hxS8siXfDuPj12BQjC1A";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const origin = new URL(request.url).origin;
  const authorization = await startAuthorization(
    GITHUB_CONNECTOR,
    { subject: { type: "user", id: user.id } },
    { callbackUrl: `${origin}/api/github/callback` },
  );

  return NextResponse.json({ url: authorization.url });
}
