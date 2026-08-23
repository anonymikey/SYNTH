"use client";

import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import type { ModuleActionState } from "@/components/modules/types";

export function ModuleActionFeedback({ state, output, error, model }: { state: ModuleActionState; output?: string; error?: string; model?: string }) {
  if (state === "idle") return null;
  const isFailure = state === "error" || state === "unavailable";
  const Icon = iconFor(isFailure ? "circleHelp" : state === "loading" ? "loader" : "checkCircle");
  const title = state === "loading" ? "SYNTH Engine is working" : state === "success" ? "SYNTH Engine completed" : state === "unavailable" ? "Capability unavailable" : "SYNTH Engine action failed";
  const message = isFailure ? error : output;

  return <div className={`rounded-lg border p-3 ${isFailure ? "border-destructive/30 bg-destructive/5" : state === "loading" ? "border-synth-cyan/25 bg-synth-cyan/5" : "border-synth-success/25 bg-synth-success/5"}`} role={isFailure ? "alert" : "status"} aria-live="polite"><div className="flex items-center gap-2"><Icon className={`size-3.5 ${state === "loading" ? "animate-spin text-synth-cyan" : isFailure ? "text-destructive" : "text-synth-success"}`} aria-hidden="true" /><p className="text-xs font-semibold">{title}</p><Badge variant="outline" className="ml-auto font-mono text-[9px] uppercase tracking-[0.1em]">{model === "synth-demo" ? "local demo" : model || state}</Badge></div>{message && <p className="mt-2 whitespace-pre-wrap text-[10px] leading-4 text-muted-foreground">{message}</p>}{state === "loading" && <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-synth-cyan">Streaming response through the provider-neutral boundary…</p>}</div>;
}
