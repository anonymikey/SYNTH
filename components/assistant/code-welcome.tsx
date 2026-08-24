"use client";

import { ThinkingOrb } from "thinking-orbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  onOpenFiles: () => void;
  onQuickAction?: (action: string) => void;
}

const QUICK_ACTIONS = [
  { id: "browse", label: "Browse Files", description: "Explore the project file tree", icon: "files", color: "cyan" as const },
  { id: "explain", label: "Explain Project", description: "Understand the architecture and purpose", icon: "lightbulb", color: "violet" as const },
  { id: "review", label: "Review Code", description: "Identify issues and improvements", icon: "gitCompare", color: "green" as const },
  { id: "bugs", label: "Find Bugs", description: "Scan for potential bugs and errors", icon: "bug", color: "red" as const },
  { id: "refactor", label: "Refactor", description: "Suggest cleaner code patterns", icon: "sparkles", color: "blue" as const },
  { id: "docs", label: "Generate Docs", description: "Create documentation for the project", icon: "bookOpen", color: "cyan" as const },
] as const;

const TONE_MAP = {
  cyan: "bg-synth-cyan/10 text-synth-cyan",
  violet: "bg-synth-violet/10 text-synth-violet",
  green: "bg-synth-success/10 text-synth-success",
  red: "bg-red-500/10 text-red-400",
  blue: "bg-blue-500/10 text-blue-400",
} as const;

export function CodeWelcome({ project, onOpenFiles, onQuickAction }: CodeWelcomeProps) {
  const CodeIcon = iconFor("code-2");

  return (
    <div className="relative flex h-full flex-col items-center overflow-y-auto">
      {/* Background glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--synth-cyan)_8%,transparent),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pt-16">
        {/* Icon + Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            <ThinkingOrb state="searching" size={64} theme="dark" />
          </div>

          <Badge
            variant="outline"
            className="mb-5 gap-2 rounded-full border-synth-cyan/25 bg-synth-cyan/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan"
          >
            <span className="size-1.5 rounded-full bg-synth-success shadow-[0_0_10px_var(--synth-success)]" />
            SYNTH Code / ready
          </Badge>

          <h1 className="font-heading text-3xl font-extrabold tracking-[-0.06em] text-foreground sm:text-5xl">
            What shall we <span className="text-synth-cyan">build</span>?
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-5 text-muted-foreground">
            AI-powered development environment. Browse, understand, and build with your project.
          </p>
        </div>

        {/* Project info (if loaded) */}
        {project && (
          <Card className="mx-auto mt-8 max-w-lg border-border/60 bg-card/60">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan">
                <CodeIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {project.language} · {project.framework} · {project.fileCount} files
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[8px] ${
                  project.adapterType === "github"
                    ? "border-blue-500/25 text-blue-400"
                    : project.adapterType === "local"
                      ? "border-synth-success/25 text-synth-success"
                      : "border-synth-violet/25 text-synth-violet"
                }`}
              >
                {project.adapterType}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Quick action cards */}
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => {
            const Icon = iconFor(action.icon);
            return (
              <Card
                key={action.id}
                className="group cursor-pointer border-border/60 bg-card/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-synth-cyan/40 hover:bg-card hover:shadow-md"
                onClick={() => {
                  if (action.id === "browse") onOpenFiles();
                  else onQuickAction?.(action.id);
                }}
              >
                <CardContent className="flex items-start gap-3 p-3">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${TONE_MAP[action.color]}`}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{action.label}</p>
                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{action.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <div className="mt-8 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/50">
            Ctrl+P quick file search · Ctrl+Shift+F project search · Ctrl+1/2/3 panel focus
          </p>
        </div>
      </div>
    </div>
  );
}
