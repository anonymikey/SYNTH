import { NextResponse } from "next/server";
import { clearAdminSession, establishAdminSession, verifyAdminSecret } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const candidate = typeof body.secret === "string" ? body.secret : "";
  if (!candidate || !verifyAdminSecret(candidate)) {
    try { const supabase = await createClient(); await supabase.from("ai_model_route_audit").insert({ event: "admin_login_failed", synth_model_id: "admin" }); } catch {}
    return NextResponse.json({ error: "Invalid administrator credentials." }, { status: 401 });
  }
  await establishAdminSession();
  try { const supabase = await createClient(); await supabase.from("ai_model_route_audit").insert({ event: "admin_login_succeeded", synth_model_id: "admin" }); } catch {}
  return NextResponse.json({ success: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
