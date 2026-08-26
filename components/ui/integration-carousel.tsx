"use client";

/* ------------------------------------------------------------------ */
/*  Real brand icons — inline SVG badges with brand colors             */
/* ------------------------------------------------------------------ */

interface BrandIcon {
  name: string;
  abbr: string;
  color: string;
  bg: string;
}

const ROW1: BrandIcon[] = [
  { name: "React", abbr: "⚛", color: "#61dafb", bg: "rgba(97,218,251,0.12)" },
  { name: "TypeScript", abbr: "TS", color: "#3178c6", bg: "rgba(49,120,198,0.12)" },
  { name: "GitHub", abbr: "GH", color: "#f0f6fc", bg: "rgba(240,246,252,0.1)" },
  { name: "Docker", abbr: "🐳", color: "#2496ed", bg: "rgba(36,150,237,0.12)" },
  { name: "Vercel", abbr: "▲", color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  { name: "PostgreSQL", abbr: "PG", color: "#4169e1", bg: "rgba(65,105,225,0.12)" },
  { name: "Node.js", abbr: "NJ", color: "#68a063", bg: "rgba(104,160,99,0.12)" },
  { name: "AWS", abbr: "aws", color: "#ff9900", bg: "rgba(255,153,0,0.1)" },
  { name: "Tailwind", abbr: "TW", color: "#06b6d4", bg: "rgba(6,182,212,0.12)" },
  { name: "Python", abbr: "PY", color: "#ffd43b", bg: "rgba(255,212,59,0.1)" },
];

const ROW2: BrandIcon[] = [
  { name: "Next.js", abbr: "Nx", color: "#ffffff", bg: "rgba(255,255,255,0.08)" },
  { name: "Redis", abbr: "RD", color: "#dc382d", bg: "rgba(220,56,45,0.12)" },
  { name: "Stripe", abbr: "S♡", color: "#635bff", bg: "rgba(99,91,255,0.12)" },
  { name: "Figma", abbr: "Fi", color: "#f24e1e", bg: "rgba(242,78,30,0.12)" },
  { name: "Prisma", abbr: "Pr", color: "#2d3748", bg: "rgba(45,55,72,0.15)" },
  { name: "Supabase", abbr: "SB", color: "#3ecf8e", bg: "rgba(62,207,142,0.12)" },
  { name: "Firebase", abbr: "FB", color: "#ffca28", bg: "rgba(255,202,40,0.1)" },
  { name: "Cloudflare", abbr: "CF", color: "#f38020", bg: "rgba(243,128,32,0.1)" },
  { name: "MongoDB", abbr: "MG", color: "#47a248", bg: "rgba(71,162,72,0.12)" },
  { name: "GraphQL", abbr: "GQ", color: "#e10098", bg: "rgba(225,0,152,0.12)" },
];

const repeat = <T,>(arr: T[], n: number): T[] =>
  Array.from({ length: n }).flatMap(() => arr);

/* ------------------------------------------------------------------ */
/*  Brand badge — compact circle with abbreviation                     */
/* ------------------------------------------------------------------ */

function BrandBadge({ icon }: { icon: BrandIcon }) {
  return (
    <div
      className="shrink-0 size-11 rounded-full flex items-center justify-center border border-white/[0.06] transition-all hover:scale-110 group"
      style={{ background: icon.bg }}
      title={icon.name}
    >
      <span
        className="text-[10px] font-bold select-none leading-none"
        style={{ color: icon.color }}
      >
        {icon.abbr}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IntegrationCarousel — infinite scrolling brand icons               */
/* ------------------------------------------------------------------ */

export function IntegrationCarousel() {
  return (
    <div className="relative w-full overflow-hidden mt-4">
      {/* Row 1 — scrolls left */}
      <div className="relative mb-3">
        <div className="flex gap-6 whitespace-nowrap animate-[scrollLeft_35s_linear_infinite]">
          {repeat(ROW1, 5).map((icon, i) => (
            <BrandBadge key={`r1-${i}`} icon={icon} />
          ))}
        </div>
        <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-[#080a12] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[#080a12] to-transparent pointer-events-none z-10" />
      </div>

      {/* Row 2 — scrolls right */}
      <div className="relative">
        <div className="flex gap-6 whitespace-nowrap animate-[scrollRight_40s_linear_infinite]">
          {repeat(ROW2, 5).map((icon, i) => (
            <BrandBadge key={`r2-${i}`} icon={icon} />
          ))}
        </div>
        <div className="absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-[#080a12] to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[#080a12] to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}
