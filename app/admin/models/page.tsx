"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const catalog = [
  ["synth-ultra", "SYNTH Ultra", "General"],
  ["synth-code", "SYNTH Code", "Coding"],
  ["synth-reason", "SYNTH Reason", "Reasoning"],
  ["synth-vision", "SYNTH Vision", "Vision"],
] as const;
type Provider = "openrouter" | "openai" | "ollama";
type Health = { result: string; created_at: string; latency_ms: number | null; http_status: number | null; normalized_error: string | null; consecutive_failures: number; fallback_active: boolean } | null;
type Route = { synth_model_id: string; provider: Provider; internal_model_id: string; source: "override" | "catalog"; health: Health };

function healthVariant(result: string | undefined) { return result === "SUCCESS" ? "default" : result === "UNAVAILABLE" || result === "RATE LIMITED" ? "secondary" : "destructive"; }
function formatDate(value?: string) { return value ? new Date(value).toLocaleString() : "Never"; }

export default function AdminModelsPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { provider: Provider; model: string }>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/admin/models", { cache: "no-store" });
    if (response.status === 401 || response.status === 403) { router.replace("/admin/login"); return; }
    const data = await response.json();
    if (!response.ok) { setMessages({ _error: data.error ?? "Unable to load administrator model routes." }); setLoading(false); return; }
    setRoutes(data.routes);
    setDrafts(Object.fromEntries(data.routes.map((route: Route) => [route.synth_model_id, { provider: route.provider, model: route.internal_model_id }])));
    setLoading(false);
  }, [router]);
  useEffect(() => { void load(); }, [load]);
  function updateDraft(id: string, key: "provider" | "model", value: string) { setDrafts((current) => ({ ...current, [id]: { ...(current[id] ?? { provider: "openrouter", model: "" }), [key]: value } as { provider: Provider; model: string } })); }
  async function resetToCatalog(id: string) {
    setMessages((current) => ({ ...current, [id]: "Restoring the verified catalog route…" }));
    const response = await fetch("/api/admin/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthModelId: id, reset: true }) });
    const data = await response.json();
    if (!response.ok) { setMessages((current) => ({ ...current, [id]: data.error ?? "Unable to restore the catalog route." })); return; }
    setMessages((current) => ({ ...current, [id]: "SUCCESS · verified catalog route restored" }));
    await load();
  }
  async function test(id: string, save: boolean) {
    const draft = drafts[id];
    if (!draft?.model) return;
    setMessages((current) => ({ ...current, [id]: "Running server-side test…" }));
    const response = await fetch("/api/admin/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthModelId: id, provider: draft.provider, internalModelId: draft.model, testOnly: !save }) });
    const data = await response.json();
    if (response.ok) { setMessages((current) => ({ ...current, [id]: `SUCCESS · ${data.latencyMs ?? "—"} ms${save ? " · route saved" : ""}` })); await load(); }
    else setMessages((current) => ({ ...current, [id]: data.error ?? "Model test failed." }));
  }
  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10"><header><p className="text-sm font-medium text-muted-foreground">Admin · AI Operations Center</p><h1 className="text-3xl font-semibold tracking-tight">SYNTH Model Routing</h1><p className="mt-2 text-muted-foreground">Private route configuration and live upstream diagnostics.</p></header>{messages._error && <p className="text-destructive">{messages._error}</p>}{loading ? <p className="text-muted-foreground">Loading operational data…</p> : <section className="grid gap-4 md:grid-cols-2">{catalog.map(([id, label, category]) => { const route = routes.find((item) => item.synth_model_id === id); const draft = drafts[id] ?? { provider: route?.provider ?? "openrouter", model: route?.internal_model_id ?? "" }; const health = route?.health; const status = health?.result === "SUCCESS" ? "ONLINE" : health?.result ? health.result === "RATE LIMITED" || health.result === "UNAVAILABLE" ? "DEGRADED" : "OFFLINE" : "UNKNOWN"; return <Card key={id}><CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle>{label}</CardTitle><CardDescription>{category}</CardDescription></div><Badge variant={healthVariant(health?.result)}>{status}</Badge></div></CardHeader><CardContent className="flex flex-col gap-4">{route?.source === "override" && <Button type="button" variant="ghost" onClick={() => void resetToCatalog(id)}>Reset to catalog</Button>}<div className="grid gap-2 sm:grid-cols-2"><select aria-label={`${label} provider`} className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={draft.provider} onChange={(event) => updateDraft(id, "provider", event.target.value)}><option value="openrouter">OpenRouter</option><option value="openai">OpenAI</option><option value="ollama">Ollama</option></select><Input aria-label={`${label} upstream model`} value={draft.model} onChange={(event) => updateDraft(id, "model", event.target.value)} placeholder="Upstream model ID" list={`${id}-model-suggestions`} /><datalist id={`${id}-model-suggestions`}><option value={route?.internal_model_id ?? ""} /><option value="openai/gpt-4o-mini" /><option value="cohere/north-mini-code:free" /><option value="deepseek/deepseek-r1:free" /><option value="google/gemini-2.0-flash-001" /></datalist></div><div className="grid gap-1 text-xs text-muted-foreground"><span>Route source: <strong className="text-foreground">{route?.source === "override" ? "Configured override" : "Catalog default"}</strong></span><span>Current route: <strong className="text-foreground">{route?.internal_model_id ?? "—"}</strong></span><span>Fallback route: <strong className="text-foreground">Catalog default</strong></span></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void test(id, false)} disabled={!draft.model}>Test Model</Button><Button onClick={() => void test(id, true)} disabled={!draft.model}>Save Route</Button></div>{messages[id] && <p className="text-sm text-muted-foreground">{messages[id]}</p>}<div className="rounded-md border bg-muted/30 p-3 text-xs"><p className="mb-2 font-medium">Operational history</p><div className="grid gap-1 text-muted-foreground"><span>Last test: <strong className="text-foreground">{formatDate(health?.created_at)}</strong></span><span>Last success: <strong className="text-foreground">{health?.result === "SUCCESS" ? formatDate(health.created_at) : "Not recorded"}</strong></span><span>Last failure: <strong className="text-foreground">{health && health.result !== "SUCCESS" ? formatDate(health.created_at) : "Not recorded"}</strong></span><span>Latency / HTTP: <strong className="text-foreground">{health?.latency_ms ? `${health.latency_ms} ms` : "—"} / {health?.http_status ?? "—"}</strong></span><span>Consecutive failures: <strong className="text-foreground">{health?.consecutive_failures ?? 0}</strong> · Fallback {health?.fallback_active ? "active" : "inactive"}</span>{health?.normalized_error && <span>Latest error: <strong className="text-foreground">{health.normalized_error}</strong></span>}</div></div></CardContent></Card>; })}</section>}</main>;
}
