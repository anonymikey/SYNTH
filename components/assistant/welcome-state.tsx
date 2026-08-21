import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";

export function WelcomeState() {
  const AssistantIcon = iconFor("sparkles");

  return (
    <section className="mx-auto max-w-3xl px-4 pb-6 pt-8 text-center sm:pt-12">
      <div className="mx-auto mb-4 flex size-10 items-center justify-center rounded-2xl border border-synth-cyan/25 bg-synth-cyan/10 text-synth-cyan shadow-[0_0_30px_color-mix(in_srgb,var(--synth-cyan)_10%,transparent)]">
        <AssistantIcon className="size-5" />
      </div>
      <Badge variant="outline" className="mb-4 gap-2 rounded-full border-synth-cyan/25 bg-synth-cyan/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan">
        <span className="size-1.5 rounded-full bg-synth-success shadow-[0_0_10px_var(--synth-success)]" /> SYNTH Assistant / ready
      </Badge>
      <h1 className="font-heading text-3xl font-extrabold tracking-[-0.06em] text-foreground sm:text-5xl">
        What are we <span className="text-synth-cyan">building</span> today?
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-5 text-muted-foreground">
        AI workspace for conversations, coding, research, and creativity.
      </p>
    </section>
  );
}
