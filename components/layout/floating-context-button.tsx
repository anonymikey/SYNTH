"use client";

import { useState } from "react";
import { iconFor } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface FloatingContextButtonProps {
  onClick: () => void;
  fileCount?: number;
  knowledgeCount?: number;
  isOpen?: boolean;
}

export function FloatingContextButton({
  onClick,
  fileCount = 2,
  knowledgeCount = 1,
  isOpen = false,
}: FloatingContextButtonProps) {
  const [minimized, setMinimized] = useState(false);
  const PanelIcon = iconFor("panelRight");
  const CloseIcon = iconFor("x");

  if (isOpen) return null;

  return (
    <div
      className={cn(
        "fixed right-3 bottom-24 z-40 flex items-center md:hidden transition-all duration-300 animate-in fade-in slide-in-from-right-4",
        minimized && "right-2 bottom-24"
      )}
    >
      {minimized ? (
        <button
          type="button"
          onClick={() => setMinimized(false)}
          className="flex size-9 items-center justify-center rounded-full border border-synth-cyan/50 bg-card text-synth-cyan shadow-xl shadow-black/50 transition-transform active:scale-95"
          aria-label="Expand SYNTH Context button"
        >
          <PanelIcon className="size-4" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-synth-cyan opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-synth-cyan" />
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-1 rounded-full border border-synth-cyan/50 bg-card p-1 shadow-xl shadow-black/50">
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-full bg-synth-cyan/15 px-2.5 py-1 text-xs font-semibold text-synth-cyan transition-colors hover:bg-synth-cyan/25 active:scale-95"
            aria-label="Open SYNTH Context panel"
          >
            <PanelIcon className="size-3.5" />
            <span>SYNTH Context</span>
            <span className="flex size-1.5 rounded-full bg-synth-cyan animate-pulse" />
            <span className="rounded-full bg-synth-cyan/20 px-1.5 py-0.2 font-mono text-[9px] text-synth-cyan">
              {fileCount + knowledgeCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMinimized(true)}
            className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Minimize floating context button"
          >
            <CloseIcon className="size-3" />
          </button>
        </div>
      )}
    </div>
  );
}
