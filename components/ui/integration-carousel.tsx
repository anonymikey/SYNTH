"use client";

import {
  Code2,
  GitBranch,
  Database,
  Globe,
  Layers,
  Rocket,
  Palette,
  Cpu,
  Terminal,
  FileCode,
  Package,
  Cloud,
  Lock,
  Zap,
  Server,
  Smartphone,
  Monitor,
  Braces,
  Workflow,
  Shield,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Icon rows — two staggered scrolling rows of tool/category icons    */
/* ------------------------------------------------------------------ */

const ROW1_ICONS = [
  { Icon: Code2, label: "Code" },
  { Icon: GitBranch, label: "Git" },
  { Icon: Database, label: "Database" },
  { Icon: Globe, label: "Web" },
  { Icon: Layers, label: "Stack" },
  { Icon: Rocket, label: "Deploy" },
  { Icon: Palette, label: "Design" },
  { Icon: Cpu, label: "Compute" },
  { Icon: Terminal, label: "Terminal" },
  { Icon: FileCode, label: "Files" },
];

const ROW2_ICONS = [
  { Icon: Package, label: "Packages" },
  { Icon: Cloud, label: "Cloud" },
  { Icon: Lock, label: "Security" },
  { Icon: Zap, label: "Performance" },
  { Icon: Server, label: "Server" },
  { Icon: Smartphone, label: "Mobile" },
  { Icon: Monitor, label: "Desktop" },
  { Icon: Braces, label: "API" },
  { Icon: Workflow, label: "Workflow" },
  { Icon: Shield, label: "Shield" },
];

const repeat = <T,>(arr: T[], n: number): T[] =>
  Array.from({ length: n }).flatMap(() => arr);

/* ------------------------------------------------------------------ */
/*  IntegrationCarousel — infinite scrolling tool icons                */
/* ------------------------------------------------------------------ */

export function IntegrationCarousel() {
  return (
    <section className="relative w-full overflow-hidden py-10">
      {/* Subtle dot grid background */}
      <div className="pointer-events-none absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.08)_1px,transparent_1px)] [background-size:20px_20px]" />

      {/* Row 1 — scrolls left */}
      <div className="relative mb-4">
        <div className="flex gap-8 whitespace-nowrap animate-[scrollLeft_40s_linear_infinite]">
          {repeat(ROW1_ICONS, 5).map(({ Icon, label }, i) => (
            <div
              key={`r1-${i}`}
              className="shrink-0 size-14 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center transition-colors hover:border-[#2dd4bf]/20 hover:bg-[#2dd4bf]/[0.05] group"
            >
              <Icon className="size-6 text-white/25 group-hover:text-[#2dd4bf]/60 transition-colors" />
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-[#080a12] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-[#080a12] to-transparent pointer-events-none z-10" />
      </div>

      {/* Row 2 — scrolls right (offset start) */}
      <div className="relative">
        <div className="flex gap-8 whitespace-nowrap animate-[scrollRight_45s_linear_infinite]">
          {repeat(ROW2_ICONS, 5).map(({ Icon, label }, i) => (
            <div
              key={`r2-${i}`}
              className="shrink-0 size-14 rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm flex items-center justify-center transition-colors hover:border-[#8b5cf6]/20 hover:bg-[#8b5cf6]/[0.05] group"
            >
              <Icon className="size-6 text-white/25 group-hover:text-[#8b5cf6]/60 transition-colors" />
            </div>
          ))}
        </div>
        {/* Fade edges */}
        <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-[#080a12] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 h-full w-20 bg-gradient-to-l from-[#080a12] to-transparent pointer-events-none z-10" />
      </div>
    </section>
  );
}
