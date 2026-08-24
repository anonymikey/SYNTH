"use client";

import { useState } from "react";
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

export function CodePreview({ project }: CodePreviewProps) {
  const [device, setDevice] = useState<PreviewDevice>("desktop");

  const DesktopIcon = iconFor("dashboard");
  const TabletIcon = iconFor("panelRight");
  const MobileIcon = iconFor("panelRight");
  const RefreshIcon = iconFor("refresh");

  return (
    <div className="flex h-full min-w-0 flex-col border-l border-border/60 bg-background/50">
      {/* Preview toolbar */}
      <div className="flex h-8 shrink-0 items-center gap-1 border-b border-border/40 px-2">
        <span className="text-[10px] font-medium text-muted-foreground">Preview</span>
        <div className="flex-1" />

        {/* Device switcher */}
        <div className="flex items-center gap-0.5 rounded-md bg-muted/30 p-0.5">
          {([
            { id: "desktop" as const, Icon: DesktopIcon, label: "Desktop" },
            { id: "tablet" as const, Icon: TabletIcon, label: "Tablet" },
            { id: "mobile" as const, Icon: MobileIcon, label: "Mobile" },
          ]).map((d) => (
            <Tooltip key={d.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`rounded p-1 transition-colors ${
                    device === d.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => setDevice(d.id)}
                >
                  <d.Icon className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{d.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-5 p-1">
              <RefreshIcon className="size-3 text-muted-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh preview</TooltipContent>
        </Tooltip>
      </div>

      {/* Preview content */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-muted/10 p-4">
        <div
          className="flex h-full w-full flex-col items-center rounded-lg border border-border/40 bg-background shadow-sm transition-all duration-200"
          style={{ maxWidth: DEVICE_WIDTHS[device] }}
        >
          {/* Browser chrome */}
          <div className="flex h-7 w-full shrink-0 items-center gap-1.5 border-b border-border/40 px-2.5">
            <div className="flex gap-1">
              <span className="size-2 rounded-full bg-destructive/40" />
              <span className="size-2 rounded-full bg-yellow-400/40" />
              <span className="size-2 rounded-full bg-synth-success/40" />
            </div>
            <div className="mx-2 flex-1 rounded bg-muted/30 px-2 py-0.5">
              <span className="font-mono text-[8px] text-muted-foreground/60">
                {project?.name?.toLowerCase().replace(/\s+/g, "-") ?? "project"}.local
              </span>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex flex-1 items-center justify-center p-6">
            <PreviewUnavailable project={project} />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex h-5 shrink-0 items-center justify-between border-t border-border/40 bg-background/80 px-3">
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground/60">
          <Badge variant="outline" className="h-3.5 border-muted-foreground/20 px-1 text-[7px]">
            No preview
          </Badge>
          <span>{device}</span>
        </div>
        <span className="font-mono text-[8px] text-muted-foreground/40">
          {DEVICE_WIDTHS[device]}
        </span>
      </div>
    </div>
  );
}

function PreviewUnavailable({
  project,
}: {
  project: CodePreviewProps["project"];
}) {
  const InfoIcon = iconFor("info");

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted/30 text-muted-foreground/40">
        <InfoIcon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">Preview unavailable</p>
        <p className="mt-1 max-w-[200px] text-[10px] text-muted-foreground/60">
          {project?.adapterType === "github"
            ? "Connect a GitHub repository with a deploy preview to see live output."
            : project?.adapterType === "local"
              ? "Start a local dev server to preview this project."
              : "Select a project with preview support."}
        </p>
      </div>
      {project?.github?.url && (
        <Button
          variant="outline"
          size="sm"
          className="h-6 gap-1 text-[9px]"
          asChild
        >
          <a href={project.github.url} target="_blank" rel="noopener noreferrer">
            View on GitHub
          </a>
        </Button>
      )}
    </div>
  );
}
