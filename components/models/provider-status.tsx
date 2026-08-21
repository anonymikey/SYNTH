"use client";

import { Badge } from "@/components/ui/badge";
import type { ProviderHealth } from "@/lib/ai/types";

const statusConfig: Record<string, { label: string; className: string; dotClass: string }> = {
  connected: { label: "Connected", className: "text-synth-success border-synth-success/25 bg-synth-success/5", dotClass: "bg-synth-success shadow-[0_0_8px_var(--synth-success)]" },
  degraded: { label: "Degraded", className: "text-yellow-500 border-yellow-500/25 bg-yellow-500/5", dotClass: "bg-yellow-500" },
  offline: { label: "Offline", className: "text-muted-foreground border-border bg-muted/30", dotClass: "bg-muted-foreground/40" },
  unsupported: { label: "N/A", className: "text-muted-foreground border-border bg-muted/30", dotClass: "bg-muted-foreground/30" },
};

function getProviderDisplay(health: ProviderHealth) {
  const isMock = health.providerId === "mock";
  const config = statusConfig[health.status] ?? statusConfig.offline;
  return {
    ...config,
    label: isMock ? "Demo" : config.label,
    providerLabel: health.providerId === "openrouter" ? "OpenRouter" : health.providerId === "ollama" ? "Ollama" : health.providerId,
  };
}

export function ProviderStatus({ health }: { health: ProviderHealth }) {
  const display = getProviderDisplay(health);

  return (
    <Badge variant="outline" className={`gap-1.5 ${display.className}`}>
      <span className={`size-1.5 rounded-full ${display.dotClass}`} />
      {display.providerLabel}
      <span className="text-[8px] opacity-70">{display.label}</span>
    </Badge>
  );
}

export function ProviderStatusInline({ health }: { health: ProviderHealth }) {
  const display = getProviderDisplay(health);

  return (
    <span className={`flex items-center gap-1.5 font-mono text-[9px] ${display.className.split(" ")[0]}`}>
      <span className={`size-1.5 rounded-full ${display.dotClass}`} />
      {display.providerLabel} {display.label}
    </span>
  );
}
