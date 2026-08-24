"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "Docs", href: "#features" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/40 bg-background/80 backdrop-blur-xl"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-synth-cyan/50 bg-synth-cyan/10 text-synth-cyan shadow-[0_0_16px_color-mix(in_srgb,var(--synth-cyan)_12%,transparent)]">
            <span className="font-heading text-xs font-bold">S</span>
          </div>
          <span className="font-heading text-sm font-extrabold tracking-[-0.04em] text-foreground">
            SYNTH
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-8 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] font-medium uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/app"
            className="rounded-lg bg-synth-cyan/10 px-4 py-1.5 font-heading text-[11px] font-bold tracking-tight text-synth-cyan transition-all hover:bg-synth-cyan/20"
          >
            Launch
          </Link>
        </div>
      </div>
    </nav>
  );
}
