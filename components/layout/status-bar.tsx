"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { SynthFooterCredit } from "@/components/branding/synth-brand";
import { Separator } from "@/components/ui/separator";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import type { ProjectSummary } from "@/types/workspace";
import type { ProviderHealth } from "@/lib/ai/types";

function useProviderHealth() {
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/ai/health");
        if (!res.ok || !active) return;
        const data = await res.json();
        const providers: ProviderHealth[] = data.providers ?? [];
        setHealth(providers);
        const anyConnected = providers.some((p) => p.status === "connected" || p.providerId === "mock");
        setConnected(anyConnected);
      } catch {
        if (active) setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  return { health, connected };
}

export function StatusBar({ project }: { project: ProjectSummary }) {
  const { health, connected } = useProviderHealth();

  // Find primary provider for display
  const openrouterHealth = health.find((p) => p.providerId === "openrouter");
  const ollamaHealth = health.find((p) => p.providerId === "ollama");
  const mockHealth = health.find((p) => p.providerId === "mock");

  const primaryProvider = openrouterHealth?.status === "connected"
    ? openrouterHealth
    : ollamaHealth?.status === "connected"
      ? ollamaHealth
      : mockHealth ?? ollamaHealth ?? openrouterHealth;

  // Use SYNTH product label instead of raw provider/model name
  const displayModel = getSynthModelLabel(primaryProvider?.model ?? "auto");

  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-background/90 px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-xl" aria-label="Workspace status">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`flex items-center gap-1.5 ${connected ? "text-synth-success" : "text-muted-foreground"}`}>
          <CheckCircle2 className="size-3" /> SYNTH
        </span>
        <Separator orientation="vertical" className="h-3" />
        <span className="hidden sm:inline">Model <b className="font-semibold text-foreground/70">{displayModel}</b></span>
        <Separator orientation="vertical" className="hidden h-3 sm:block" />
        <span className="hidden md:inline">Memory <b className="font-semibold text-foreground/70">—</b></span>
      </div>
      <div className="flex items-center gap-2.5">
        <SynthFooterCredit className="hidden lg:block" />
        <Separator orientation="vertical" className="hidden h-3 lg:block" />
        <span className="hidden sm:inline">Workspace <b className="font-semibold text-foreground/70">{project.syncState === "synced" ? "ready" : project.syncState}</b></span>
        <Separator orientation="vertical" className="h-3" />
        <span>{project.version}</span>
        <Separator orientation="vertical" className="h-3" />
        <span className={connected ? "flex items-center gap-1.5 text-synth-cyan" : "flex items-center gap-1.5 text-destructive"}>
          <Circle className="size-1.5 fill-current" /> {connected ? "Online" : "Offline"}
        </span>
      </div>
    </footer>
  );
}
