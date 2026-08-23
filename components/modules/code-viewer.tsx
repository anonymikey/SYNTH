"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { iconFor } from "@/lib/icons";
import { formatLineNumber } from "@/components/modules/formatters";
import type { ProjectFileContent } from "@/lib/project/use-project";

interface CodeViewerProps {
  file: ProjectFileContent | null;
  loading: boolean;
  adapterType: "local" | "demo" | "github";
}

export function CodeViewer({ file, loading, adapterType }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <Card className="min-w-0">
        <CardHeader className="gap-3 border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <div className="size-4 animate-spin rounded-full border-2 border-synth-cyan/30 border-t-synth-cyan" />
            <span className="text-sm text-muted-foreground">Reading file...</span>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 rounded bg-muted/30" style={{ width: `${60 + ((i * 7 + 3) % 10) * 3.5}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!file) {
    const InfoIcon = iconFor("info");
    return (
      <Card className="min-w-0">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-synth-cyan/10 text-synth-cyan">
            <InfoIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Select a file to inspect</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose a file from the explorer to view its contents.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lines = file.content.split("\n");
  const lineNumberWidth = String(lines.length).length;
  const CopyIcon = iconFor(copied ? "check" : "clipboard");

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 border-b border-border/70 pb-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{file.path}</CardTitle>
            <div className="mt-1 flex items-center gap-2 text-[9px] text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.12em]">{file.language}</span>
              <span>·</span>
              <span>{lines.length} lines</span>
              <span>·</span>
              <span>{(file.byteSize / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[9px] ${
                adapterType === "local"
                  ? "border-synth-success/25 text-synth-success"
                  : adapterType === "github"
                    ? "border-blue-500/25 text-blue-400"
                    : "border-synth-violet/25 text-synth-violet"
              }`}
            >
              {adapterType === "local" ? "local project" : adapterType === "github" ? "github" : "demo project"}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[10px]"
              onClick={handleCopy}
              aria-label="Copy file content"
            >
              <CopyIcon className="size-3" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto rounded-b-lg border-t border-border bg-background/70" style={{ maxHeight: "40rem" }}>
          <pre className="min-w-max p-3 font-mono text-[11px] leading-6 text-foreground/85">
            <code>
              {lines.map((line, index) => (
                <span key={`${file.path}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)] hover:bg-synth-cyan/[0.03]">
                  <span className="select-none pr-3 text-right text-muted-foreground/40">
                    {formatLineNumber(index + 1, lineNumberWidth)}
                  </span>
                  <span className="whitespace-pre">{line || " "}</span>
                </span>
              ))}
            </code>
          </pre>
        </div>
        {/* Read-only status bar */}
        <div className="flex items-center justify-between border-t border-border/50 px-3 py-1.5">
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-synth-success/60" />
            <span>Read-only workspace</span>
          </div>
          <span className="font-mono text-[8px] text-muted-foreground/50">SYNTH Code</span>
        </div>
      </CardContent>
    </Card>
  );
}
