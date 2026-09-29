"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const catalog = [
  ["synth-ultra", "SYNTH Ultra", "General"],
  ["synth-code", "SYNTH Code", "Coding"],
  ["synth-reason", "SYNTH Reason", "Reasoning"],
  ["synth-vision", "SYNTH Vision", "Vision"],
] as const;

export default function AdminModelsPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<Record<string, string>>({});
  const [sources, setSources] = useState<Record<string, "override" | "catalog">>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  useEffect(() => {
    fetch("/api/admin/models").then((response) => {
      if (response.status === 401) {
        router.replace("/admin/login");
        return Promise.reject(new Error("unauthorized"));
      }
      if (response.status === 403) return response.json().then((data) => Promise.reject(new Error(data.error ?? "Unable to load routes.")));
      return response.ok ? response.json() : Promise.reject(new Error("request failed"));
    }).then((data) => {
      setRoutes(Object.fromEntries(data.routes.map((route: { synth_model_id: string; internal_model_id: string }) => [route.synth_model_id, route.internal_model_id])));
      setSources(Object.fromEntries(data.routes.map((route: { synth_model_id: string; source: "override" | "catalog" }) => [route.synth_model_id, route.source])));
    }).catch((error) => {
      if (error.message !== "unauthorized") setStatus({ _error: "Unable to load administrator model routes." });
    });
  }, [router]);
  async function save(id: string) { setStatus((s) => ({ ...s, [id]: "Testing…" })); const response = await fetch("/api/admin/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthModelId: id, provider: "openrouter", internalModelId: routes[id], }) }); const data = await response.json(); setStatus((s) => ({ ...s, [id]: response.ok ? "Updated successfully." : data.error ?? "Unable to activate this model." })); }
  async function test(id: string) { setStatus((s) => ({ ...s, [id]: "Testing…" })); const response = await fetch("/api/admin/models", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ synthModelId: id, provider: "openrouter", internalModelId: routes[id], testOnly: true }) }); const data = await response.json(); setStatus((s) => ({ ...s, [id]: data.result ?? data.error })); }
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10"><header><p className="text-sm font-medium text-muted-foreground">Admin</p><h1 className="text-3xl font-semibold tracking-tight">SYNTH Model Routing</h1><p className="mt-2 text-muted-foreground">Manage the private upstream model for each public SYNTH identity.</p></header>{status._error && <p className="text-destructive">{status._error}</p>}<section className="grid gap-4 md:grid-cols-2">{catalog.map(([id, label, category]) => <Card key={id}><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle>{label}</CardTitle><CardDescription>{category}</CardDescription></div><div className="flex flex-wrap justify-end gap-2"><Badge variant="secondary">OpenRouter</Badge><Badge variant={sources[id] === "override" ? "default" : "outline"}>{sources[id] === "override" ? "Configured Override" : "Catalog/Default Route"}</Badge></div></div></CardHeader><CardContent className="flex flex-col gap-4"><Input aria-label={`${label} backend model`} value={routes[id] ?? ""} onChange={(e) => setRoutes((r) => ({ ...r, [id]: e.target.value }))} placeholder="provider/model-id" /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => test(id)} disabled={!routes[id]}>Test Model</Button><Button onClick={() => save(id)} disabled={!routes[id]}>Save</Button></div>{status[id] && <p className="text-sm text-muted-foreground">{status[id]}</p>}</CardContent></Card>)}</section></main>;
}
