import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in to delete your account." }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.error("[v0] Account deletion is missing the server-only Supabase service key.");
    return NextResponse.json({ error: "Account deletion is temporarily unavailable." }, { status: 503 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[v0] Supabase account deletion failed:", error.message);
    return NextResponse.json({ error: "We could not delete your account. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
