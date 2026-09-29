import { createClient } from "@/lib/supabase/server";
import { SYNTH_MODEL_CATALOG } from "@/lib/ai/synth-models";
import type { ProviderId, ProviderSelection } from "@/lib/ai/types";
import { hasAdminSession } from "@/lib/admin-auth";

const allowedIds = new Set(SYNTH_MODEL_CATALOG.map((model) => model.id));
const modelPattern = /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._:-]*$/i;

export function validateRoute(synthModelId: string, provider: string, model: string) {
  if (!allowedIds.has(synthModelId)) throw new Error("Unknown SYNTH model.");
  if (provider !== "openrouter") throw new Error("Provider is not allowed.");
  if (!model.trim() || !modelPattern.test(model.trim())) throw new Error("Invalid model configuration.");
  return model.trim();
}

export async function isAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const secretSession = await hasAdminSession();
  return { supabase, user, allowed: secretSession || user?.app_metadata?.is_admin === true || user?.app_metadata?.role === "admin" };
}

export async function getAdminRoutes() {
  const { supabase, allowed } = await isAdmin();
  if (!allowed) throw new Error("Unauthorized");
  const { data, error } = await supabase.from("ai_model_routes").select("id,synth_model_id,provider,internal_model_id,enabled,updated_at").order("synth_model_id");
  if (error) throw error;

  const overrides = new Map((data ?? []).map((route) => [route.synth_model_id, route]));
  return SYNTH_MODEL_CATALOG.map((profile) => {
    const override = overrides.get(profile.id);
    return override
      ? { ...override, source: "override" as const }
      : {
          id: null,
          synth_model_id: profile.id,
          provider: profile.internal.providerId,
          internal_model_id: profile.internal.model,
          enabled: profile.available,
          updated_at: null,
          source: "catalog" as const,
        };
  });
}

export async function resolveSynthModelAsync(modelId: string): Promise<ProviderSelection> {
  const profile = SYNTH_MODEL_CATALOG.find((model) => model.id === modelId);
  if (!profile) {
    const { resolveSynthModel } = await import("@/lib/ai/synth-models");
    return resolveSynthModel(modelId);
  }
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("ai_model_routes").select("provider,internal_model_id,enabled").eq("synth_model_id", modelId).eq("enabled", true).maybeSingle();
    if (data) return { providerId: data.provider as ProviderId, model: data.internal_model_id, allowFallback: profile.internal.allowFallback };
  } catch {}
  return profile.internal;
}

export async function testOpenRouter(model: string): Promise<"SUCCESS" | "UNAVAILABLE" | "RATE LIMITED" | "INVALID MODEL" | "AUTH ERROR" | "ERROR"> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return "AUTH ERROR";
  try {
    const response = await fetch(`${process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with OK." }], max_tokens: 2 }), cache: "no-store" });
    if (response.ok) return "SUCCESS";
    if (response.status === 401 || response.status === 403) return "AUTH ERROR";
    if (response.status === 429) return "RATE LIMITED";
    if (response.status === 400 || response.status === 404) return "INVALID MODEL";
    return "UNAVAILABLE";
  } catch { return "ERROR"; }
}

export async function audit(event: string, synthModelId: string, userId?: string) {
  const supabase = await createClient();
  await supabase.from("ai_model_route_audit").insert({ event, synth_model_id: synthModelId, administrator: userId });
}

export { allowedIds };
