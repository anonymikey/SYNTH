import { CheckCircle2, Circle } from "lucide-react";
import { SynthFooterCredit } from "@/components/branding/synth-brand";
import { Separator } from "@/components/ui/separator";
import type { ProjectSummary } from "@/types/workspace";

export function StatusBar({ project, model, connected }: { project: ProjectSummary; model: string; connected: boolean }) {
  return (
    <footer className="flex h-7 shrink-0 items-center justify-between border-t border-border bg-background/90 px-3 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-xl" aria-label="Workspace status">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-synth-success"><CheckCircle2 className="size-3" /> Ollama local</span>
        <Separator orientation="vertical" className="h-3" />
        <span className="hidden sm:inline">Model <b className="font-semibold text-foreground/70">{model}</b></span>
        <Separator orientation="vertical" className="hidden h-3 sm:block" />
        <span className="hidden md:inline">Memory <b className="font-semibold text-foreground/70">38%</b></span>
      </div>
      <div className="flex items-center gap-2.5">
        <SynthFooterCredit className="hidden lg:block" />
        <Separator orientation="vertical" className="hidden h-3 lg:block" />
        <span className="hidden sm:inline">Workspace <b className="font-semibold text-foreground/70">{project.syncState === "synced" ? "ready" : project.syncState}</b></span>
        <Separator orientation="vertical" className="h-3" />
        <span>{project.version}</span>
        <Separator orientation="vertical" className="h-3" />
        <span className={connected ? "flex items-center gap-1.5 text-synth-cyan" : "flex items-center gap-1.5 text-destructive"}><Circle className="size-1.5 fill-current" /> {connected ? "Online" : "Offline"}</span>
      </div>
    </footer>
  );
}
