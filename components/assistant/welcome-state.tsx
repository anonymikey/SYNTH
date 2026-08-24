import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";

export function WelcomeState() {
  const AssistantIcon = iconFor("sparkles");

  return (
    <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 text-center sm:pt-12">
      {/* Icon */}
      <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl border border-synth-cyan/20 bg-synth-cyan/8 text-synth-cyan shadow-[0_0_50px_color-mix(in_srgb,var(--synth-cyan)_8%,transparent)]">
        <AssistantIcon className="size-7" />
      </div>

      {/* Status badge */}
      <Badge
        variant="outline"
        className="mb-5 gap-2 rounded-full border-synth-cyan/20 bg-synth-cyan/5 px-3 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan"
      >
        <span className="size-1.5 rounded-full bg-synth-success shadow-[0_0_10px_var(--synth-success)]" />
        SYNTH Assistant / ready
      </Badge>

      {/* Main heading */}
      <h1 className="font-heading text-3xl font-extrabold tracking-[-0.06em] text-foreground sm:text-5xl">
        What are we{" "}
        <span className="bg-gradient-to-r from-synth-cyan to-blue-400 bg-clip-text text-transparent">
          building
        </span>{" "}
        today?
      </h1>

      <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
        Your AI assistant for conversations, coding, research, and creativity.
      </p>
    </section>
  );
}
