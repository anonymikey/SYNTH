"use client";

import { Button } from "@/components/ui/button";
import { iconFor } from "@/lib/icons";

interface WorkspaceFrameProps {
  icon: ReturnType<typeof iconFor>;
  eyebrow: string;
  title: string;
  description: string;
  onBackToAssistant: () => void;
  children: React.ReactNode;
}

export function WorkspaceFrame({
  icon: Icon,
  eyebrow,
  title,
  description,
  onBackToAssistant,
  children,
}: WorkspaceFrameProps) {
  return (
    <section className="relative min-h-0 flex-1 overflow-y-auto">
      <div className="synth-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-synth-cyan/25 bg-synth-cyan/10 text-synth-cyan">
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <Button variant="ghost" onClick={onBackToAssistant}>
            Back to Assistant
          </Button>
        </div>
        {children}
      </div>
    </section>
  );
}
