import { SynthFooterCredit } from "@/components/branding/synth-brand";

const LINKS = [
  { label: "Documentation", href: "#features" },
  { label: "GitHub", href: "https://github.com/anonymiketech" },
  { label: "Privacy", href: "#" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 sm:flex-row sm:justify-between">
        <SynthFooterCredit />

        <div className="flex items-center gap-6">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
