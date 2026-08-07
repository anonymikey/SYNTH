import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";

export function WelcomeState() {
  const badges = ["Assistant active", "Memory scoped", "Ollama ready"];
  const AssistantIcon = iconFor("sparkles");

  return (
    <section className="mx-auto max-w-3xl px-4 pb-8 pt-10 text-center sm:pt-14">
      <div className="mx-auto mb-5 flex size-11 items-center justify-center rounded-2xl border border-synth-cyan/25 bg-synth-cyan/10 text-synth-cyan shadow-[0_0_30px_color-mix(in_srgb,var(--synth-cyan)_12%,transparent)]">
        <AssistantIcon className="size-5" />
      </div>
      <Badge variant="outline" className="mb-5 gap-2 rounded-full border-synth-cyan/25 bg-synth-cyan/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan">
        <span className="size-1.5 rounded-full bg-synth-success shadow-[0_0_10px_var(--synth-success)]" /> SYNTH Assistant / ready
      </Badge>
      <h1 className="font-heading text-balance text-4xl font-extrabold tracking-[-0.06em] text-foreground sm:text-6xl lg:text-7xl">What are we <span className="text-synth-cyan">building</span> today?</h1>
      <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">Your intelligent AI workspace for conversations, coding, research, automation, and creativity — powered by a modular local-first provider layer.</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {badges.map((badge) => <span key={badge} className="rounded-full border border-border bg-muted/30 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{badge}</span>)}
      </div>
    </section>
  );
}
