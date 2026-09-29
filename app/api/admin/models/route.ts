import { NextResponse } from "next/server";
import { audit, getAdminRoutes, isAdmin, validateRoute } from "@/lib/ai/model-routing";
import { testOpenAI } from "@/lib/ai/providers/openai-provider";
import { testOpenRouter } from "@/lib/ai/model-routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestResult = { result: string; latencyMs: number | null; httpStatus: number | null; normalizedError: string | null };

async function testOllama(model: string): Promise<TestResult> {
  const started = Date.now();
  try {
    const response = await fetch(`${process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434"}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with OK." }], stream: false }), cache: "no-store" });
    return { result: response.ok ? "SUCCESS" : response.status === 404 ? "INVALID MODEL" : "UNAVAILABLE", latencyMs: Date.now() - started, httpStatus: response.status, normalizedError: response.ok ? null : `Ollama returned HTTP ${response.status}.` };
  } catch { return { result: "ERROR", latencyMs: Date.now() - started, httpStatus: null, normalizedError: "Ollama is unavailable." }; }
}

async function runTest(provider: string, model: string): Promise<TestResult> {
  const started = Date.now();
  if (provider === "ollama") return testOllama(model);
  const result = provider === "openai" ? await testOpenAI(model) : await testOpenRouter(model);
  const normalizedError = result === "SUCCESS" ? null : result === "AUTH ERROR" ? "Provider authentication failed." : result === "RATE LIMITED" ? "Provider rate limit or quota reached." : result === "INVALID MODEL" ? "The upstream model ID is invalid." : result === "UNAVAILABLE" ? "The provider is unavailable." : "The provider test failed.";
  return { result, latencyMs: Date.now() - started, httpStatus: null, normalizedError };
}

export async function GET() {
  try {
    const { supabase, allowed } = await isAdmin();
    if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const routes = await getAdminRoutes();
    const { data: checks, error } = await supabase.from("ai_model_health_checks").select("synth_model_id,result,created_at,latency_ms,http_status,normalized_error,consecutive_failures,fallback_active").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const latest = new Map<string, unknown>();
    for (const check of checks ?? []) if (!latest.has(check.synth_model_id)) latest.set(check.synth_model_id, check);
    return NextResponse.json({ routes: routes.map((route) => ({ ...route, health: latest.get(route.synth_model_id) ?? null })) });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "Unauthorized";
    return NextResponse.json({ error: unauthorized ? "Unauthorized" : "Unable to load routes." }, { status: unauthorized ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user, allowed } = await isAdmin();
    if (!allowed) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    const body = await request.json();
    const model = validateRoute(body.synthModelId, body.provider, body.internalModelId);
    const result = await runTest(body.provider, model);
    const { data: previous } = await supabase.from("ai_model_health_checks").select("result,consecutive_failures").eq("synth_model_id", body.synthModelId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const consecutiveFailures = result.result === "SUCCESS" ? 0 : (previous?.consecutive_failures ?? 0) + 1;
    await supabase.from("ai_model_health_checks").insert({ synth_model_id: body.synthModelId, provider: body.provider, internal_model_id: model, result: result.result, administrator: user?.id ?? null, latency_ms: result.latencyMs, http_status: result.httpStatus, normalized_error: result.normalizedError, consecutive_failures: consecutiveFailures, fallback_active: false });
    await audit(result.result === "SUCCESS" ? "model_route_tested" : "model_route_test_failed", body.synthModelId, user?.id);
    if (body.testOnly) return NextResponse.json({ ...result, consecutiveFailures });
    if (result.result !== "SUCCESS") return NextResponse.json({ error: result.normalizedError ?? "Model test failed.", ...result, consecutiveFailures }, { status: 422 });
    const { error } = await supabase.from("ai_model_routes").upsert({ synth_model_id: body.synthModelId, provider: body.provider, internal_model_id: model, enabled: true, updated_by: user?.id ?? null, updated_at: new Date().toISOString() }, { onConflict: "synth_model_id" });
    if (error) throw error;
    await audit("model_route_updated", body.synthModelId, user?.id);
    return NextResponse.json({ success: true, ...result, consecutiveFailures });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update route." }, { status: 400 }); }
}
