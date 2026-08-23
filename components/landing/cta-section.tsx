import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[400px] w-[600px] rounded-full bg-synth-cyan/5 blur-[120px]" />
        </div>

        <div className="relative">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-synth-cyan">
            Get Started
          </p>
          <h2 className="font-heading text-3xl font-extrabold tracking-[-0.03em] text-foreground sm:text-4xl md:text-5xl">
            Ready to build smarter?
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            SYNTH is free and open. Launch your workspace in seconds — no
            account required to explore.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth"
              className="group inline-flex items-center gap-2.5 rounded-xl bg-synth-cyan px-8 py-4 font-heading text-sm font-bold tracking-tight text-[#061014] shadow-[0_0_40px_color-mix(in_srgb,var(--synth-cyan)_20%,transparent)] transition-all duration-200 hover:shadow-[0_0_60px_color-mix(in_srgb,var(--synth-cyan)_32%,transparent)] hover:brightness-110"
            >
              Launch SYNTH
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            No credit card · No cloud lock-in · Your data stays local
          </p>
        </div>
      </div>
    </section>
  );
}
