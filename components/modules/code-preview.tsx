"use client";

import { useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";

type PreviewDevice = "desktop" | "tablet" | "mobile";

interface CodePreviewProps {
  project: {
    name: string;
    adapterType: string;
    github?: { owner: string; repo: string; ref: string; url: string };
  } | null;
}

const DEVICE_WIDTHS: Record<PreviewDevice, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const DEVICE_LABELS: Record<PreviewDevice, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

export function CodePreview({ project }: CodePreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#0c0e16]">
      {/* Preview toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-white/[.06] px-2">
        <span className="text-[10px] font-medium text-white/60">Preview</span>
        <div className="flex-1" />

        {/* Device switcher */}
        <div className="flex items-center gap-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] p-0.5">
          {(["desktop", "tablet", "mobile"] as const).map((d) => (
            <Tooltip key={d}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`rounded px-1.5 py-0.5 text-[8px] font-medium transition-colors ${
                    device === d
                      ? "bg-white/[0.08] text-white/80"
                      : "text-white/30 hover:text-white/50"
                  }`}
                  onClick={() => setDevice(d)}
                >
                  {DEVICE_LABELS[d]}
                </button>
              </TooltipTrigger>
              <TooltipContent>{DEVICE_LABELS[d]} preview</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-5 p-1">
              {(() => { const RefreshIcon = iconFor("refresh"); return <RefreshIcon className="size-3 text-white/30" />; })()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh preview</TooltipContent>
        </Tooltip>
      </div>

      {/* Preview content */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-[#080a12]/50 p-4">
        <div
          className="flex h-full w-full flex-col items-center rounded-lg border border-white/[.06] bg-[#11151d] transition-all duration-300"
          style={{ maxWidth: DEVICE_WIDTHS[device] }}
        >
          {/* Browser chrome */}
          <div className="flex h-7 w-full shrink-0 items-center gap-1.5 border-b border-white/[.06] px-2.5 bg-[#0c0e16]">
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-red-400/40" />
              <span className="size-1.5 rounded-full bg-yellow-400/40" />
              <span className="size-1.5 rounded-full bg-green-400/40" />
            </div>
            <div className="mx-2 flex-1 rounded bg-white/[0.04] px-2 py-0.5">
              <span className="font-mono text-[7px] text-white/30">
                {project?.name?.toLowerCase().replace(/\s+/g, "-") ?? "project"}.local
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="p-0.5 text-white/20 hover:text-white/40 transition-colors">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>Open in new tab</TooltipContent>
            </Tooltip>
          </div>

          {/* Preview area */}
          <div className="flex flex-1 items-center justify-center p-6 w-full">
            <PreviewPreparingState project={project} />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-5 shrink-0 items-center justify-between border-t border-white/[.06] bg-[#0c0e16] px-3">
        <div className="flex items-center gap-2 text-[8px] text-white/30">
          <Badge variant="outline" className="h-3.5 border-white/[0.08] px-1 text-[7px] text-white/25">
            No preview
          </Badge>
          <span>{device}</span>
        </div>
        <span className="font-mono text-[7px] text-white/20">
          {DEVICE_WIDTHS[device]}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PreviewPreparingState — ORB-based preparation animation            */
/* ------------------------------------------------------------------ */

function PreviewPreparingState({
  project: _project,
}: {
  project: CodePreviewProps["project"];
}) {
  const steps = [
    { label: "Analyzing project", active: true },
    { label: "Building interface", active: false },
    { label: "Preparing viewport", active: false },
  ];

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* ORB */}
      <div className="relative">
        <ThinkingOrb state="listening" size={64} theme="dark" />
        <div className="absolute inset-0 rounded-full bg-[#2dd4bf]/5 animate-[breathe_3s_ease-in-out_infinite]" />
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-[12px] text-white/50 font-medium">Preparing preview</p>
        <div className="flex flex-col items-center gap-1 mt-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className={`size-1 rounded-full ${step.active ? "bg-[#2dd4bf]" : "bg-white/10"}`} />
              <span className={`text-[9px] ${step.active ? "text-white/40" : "text-white/15"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-32 h-0.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div className="h-full w-1/3 bg-gradient-to-r from-[#2dd4bf]/40 to-[#9670ff]/40 rounded-full animate-[shimmer_2s_linear_infinite]" style={{ backgroundSize: "200% 100%" }} />
      </div>
    </div>
  );
}
