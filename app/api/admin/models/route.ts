import { NextResponse } from "next/server";
import { audit, getAdminRoutes, isAdmin, testOpenRouter, validateRoute } from "@/lib/ai/model-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ routes: await getAdminRoutes() });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json(
      { error: unauthorized ? "Unauthorized" : "Unable to load routes." },
      { status: unauthorized ? 401 : 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, allowed } = await isAdmin();
    if (!allowed || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const body = await request.json();
    const model = validateRoute(body.synthModelId, body.provider, body.internalModelId);
    const result = await testOpenRouter(model);
    await audit(result === "SUCCESS" ? "model_route_tested" : "model_route_test_failed", body.synthModelId, user.id);
    if (body.testOnly) return NextResponse.json({ result });
    if (result !== "SUCCESS") return NextResponse.json({ error: "Unable to activate this model.", result }, { status: 422 });
    const { error } = await supabase.from("ai_model_routes").upsert({ synth_model_id: body.synthModelId, provider: body.provider, internal_model_id: model, enabled: body.enabled !== false, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: "synth_model_id" });
    if (error) throw error;
    await audit("model_route_updated", body.synthModelId, user.id);
    return NextResponse.json({ success: true, result });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update route." }, { status: 400 }); }
}
