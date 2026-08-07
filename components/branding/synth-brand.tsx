import { cn } from "@/lib/utils";

interface SynthBrandProps {
  compact?: boolean;
  showByline?: boolean;
  className?: string;
}

export function SynthBrand({ compact = false, showByline = false, className }: SynthBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-synth-cyan/50 bg-synth-cyan/10 text-synth-cyan shadow-[0_0_22px_color-mix(in_srgb,var(--synth-cyan)_16%,transparent)]" aria-hidden="true">
        <span className="font-heading text-sm font-bold">S</span>
      </div>
      <div className="min-w-0">
        <p className={cn("truncate font-heading font-extrabold tracking-[-0.04em]", compact ? "text-xs" : "text-sm")}>SYNTH</p>
        {showByline && <p className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">by ANONYMIKETECH</p>}
      </div>
    </div>
  );
}

export function SynthFooterCredit({ className }: { className?: string }) {
  return <p className={cn("font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground/60", className)}>SYNTH <span className="text-muted-foreground/40">· by ANONYMIKETECH</span></p>;
}
