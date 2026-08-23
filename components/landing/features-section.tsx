import {
  MessageCircle,
  Code2,
  Route,
  BookOpen,
  Search,
  Image,
  Shield,
  Cpu,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: MessageCircle,
    title: "SYNTH Assistant",
    description:
      "Conversational AI that understands context, remembers your projects, and adapts to your preferred models.",
    accent: "from-synth-cyan/20 to-synth-cyan/5",
    iconColor: "text-synth-cyan",
    status: "active",
  },
  {
    icon: Code2,
    title: "SYNTH Code",
    description:
      "Read, understand, and generate code across repositories. Explain files, review diffs, and build with AI assistance.",
    accent: "from-synth-cyan/20 to-synth-cyan/5",
    iconColor: "text-synth-cyan",
    status: "active",
  },
  {
    icon: Search,
    title: "SYNTH Search",
    description:
      "Semantic search across your workspace, documentation, and the web — all from a single query bar.",
    accent: "from-synth-violet/20 to-synth-violet/5",
    iconColor: "text-synth-violet",
    status: "active",
  },
  {
    icon: BookOpen,
    title: "SYNTH Docs",
    description:
      "A living knowledge base. Ingest documentation, specs, and notes — SYNTH retrieves what you need, when you need it.",
    accent: "from-synth-violet/20 to-synth-violet/5",
    iconColor: "text-synth-violet",
    status: "active",
  },
  {
    icon: Route,
    title: "SYNTH Agent",
    description:
      "Autonomous workflow execution. Define goals, set guardrails, and let the agent run multi-step tasks end to end.",
    accent: "from-synth-cyan/15 to-synth-violet/10",
    iconColor: "text-synth-cyan",
    status: "planned",
  },
  {
    icon: Image,
    title: "SYNTH Vision",
    description:
      "Image understanding, generation, and editing — powered by the latest multimodal models.",
    accent: "from-synth-cyan/15 to-synth-violet/10",
    iconColor: "text-synth-violet",
    status: "coming-soon",
  },
];

const CAPABILITIES = [
  {
    icon: Shield,
    title: "Local-First",
    description:
      "Your code and data stay on your machine. No cloud dependency unless you choose it.",
  },
  {
    icon: Cpu,
    title: "Multi-Provider",
    description:
      "Switch between OpenAI, Ollama, OpenRouter, and custom providers without changing your workflow.",
  },
  {
    icon: Zap,
    title: "Modular Design",
    description:
      "Enable only the modules you need. Every component is pluggable, replaceable, and extensible.",
  },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return null;
  return (
    <span className="ml-2 inline-flex items-center rounded-full border border-synth-violet/20 bg-synth-violet/10 px-2 py-0.5 font-mono text-[8px] uppercase tracking-[0.15em] text-synth-violet">
      {status === "planned" ? "Planned" : "Soon"}
    </span>
  );
}

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-16 text-center">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-synth-cyan">
            Modules
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl md:text-5xl">
            Everything you need,
            <br />
            nothing you don&apos;t
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Six specialized modules, one unified workspace. Activate what
            matters, ignore the rest.
          </p>
        </div>

        {/* Module grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={cn(
                  "group relative rounded-2xl border border-border/60 bg-card/50 p-6 transition-all duration-300",
                  "hover:border-synth-cyan/30 hover:bg-card/80 hover:shadow-[0_8px_40px_color-mix(in_srgb,var(--synth-cyan)_8%,transparent)]"
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mb-4 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br",
                    feature.accent
                  )}
                >
                  <Icon className={cn("size-5", feature.iconColor)} />
                </div>

                {/* Title */}
                <div className="mb-2 flex items-center">
                  <h3 className="font-heading text-sm font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <StatusBadge status={feature.status} />
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Capabilities strip */}
        <div className="mt-20 grid gap-8 sm:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div key={cap.title} className="text-center">
                <div className="mx-auto mb-3 flex size-8 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan">
                  <Icon className="size-4" />
                </div>
                <h4 className="mb-1 font-heading text-xs font-bold tracking-tight text-foreground">
                  {cap.title}
                </h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {cap.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
