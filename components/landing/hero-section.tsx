"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

const LatticeCanvas = dynamic(
  () =>
    import("@/components/landing/lattice-canvas").then((m) => m.LatticeCanvas),
  { ssr: false }
);

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* LATTICE WebGL background */}
      <LatticeCanvas className="pointer-events-none" />

      {/* Content overlay */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-synth-cyan/20 bg-synth-cyan/5 px-4 py-1.5 backdrop-blur-sm">
          <Sparkles className="size-3.5 text-synth-cyan" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-synth-cyan">
            AI-Powered Workspace
          </span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-5xl font-extrabold leading-[1.05] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl lg:text-8xl">
          The workspace that
          <br />
          <span className="bg-gradient-to-r from-synth-cyan via-[#5cf2ff] to-synth-violet bg-clip-text text-transparent">
            thinks with you
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
          SYNTH is a modular, local-first AI workspace. Code, search, document,
          and create — all from one intelligent interface that adapts to your
          workflow.
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/auth"
            className="group inline-flex items-center gap-2.5 rounded-xl bg-synth-cyan px-7 py-3.5 font-heading text-sm font-bold tracking-tight text-[#061014] shadow-[0_0_40px_color-mix(in_srgb,var(--synth-cyan)_24%,transparent)] transition-all duration-200 hover:shadow-[0_0_60px_color-mix(in_srgb,var(--synth-cyan)_36%,transparent)] hover:brightness-110"
          >
            Launch Workspace
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 font-heading text-sm font-semibold tracking-tight text-white/80 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
          >
            Explore Features
          </a>
        </div>

        {/* Proof points */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground/60">
          <span>Local-First</span>
          <span className="hidden text-muted-foreground/30 sm:inline">·</span>
          <span>Modular Architecture</span>
          <span className="hidden text-muted-foreground/30 sm:inline">·</span>
          <span>OpenAI · Ollama · OpenRouter</span>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
