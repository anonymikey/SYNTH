"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");

  const handleCopy = async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lines must be computed outside conditional to keep hooks stable
  const lines = file ? file.content.split("\n") : [];
  const lineNumberWidth = String(Math.max(lines.length, 1)).length;

  // Highlight matching lines — must be called unconditionally
  const matchLines = useMemo(() => {
    if (!findQuery.trim() || lines.length === 0) return new Set<number>();
    const matches = new Set<number>();
    const q = findQuery.toLowerCase();
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(q)) matches.add(i);
    });
    return matches;
  }, [findQuery, lines]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 px-3">
          <div className="size-3 animate-spin rounded-full border-2 border-synth-cyan/30 border-t-synth-cyan" />
          <span className="text-[10px] text-muted-foreground">Reading file...</span>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-4 rounded bg-muted/20"
                style={{ width: `${60 + ((i * 7 + 3) % 10) * 3.5}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!file) {
    const CodeIcon = iconFor("code-2");
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-synth-cyan/10 text-synth-cyan">
          <CodeIcon className="size-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Select a file to inspect</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a file from the explorer to view its contents.
          </p>
        </div>
        <p className="font-mono text-[9px] text-muted-foreground/40">
          SYNTH Code — Read-only workspace
        </p>
      </div>
    );
  }

  const CopyIcon = iconFor(copied ? "check" : "clipboard");
  const SearchIcon = iconFor("search");
  const XIcon = iconFor("x");

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* File header bar */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <span className="truncate text-[11px] font-medium text-foreground">{file.path}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className={`hidden text-[7px] uppercase tracking-wider sm:inline-flex ${
              adapterType === "local"
                ? "border-synth-success/25 text-synth-success"
                : adapterType === "github"
                  ? "border-blue-500/25 text-blue-400"
                  : "border-synth-violet/25 text-synth-violet"
            }`}
          >
            {adapterType === "local" ? "local" : adapterType === "github" ? "github" : "demo"}
          </Badge>
          <span className="font-mono text-[8px] text-muted-foreground/50">
            {file.language} · {lines.length} lines
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 gap-1 px-1.5 text-[9px]"
                onClick={() => setFindOpen((o) => !o)}
              >
                <SearchIcon className="size-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Find in file (Ctrl+F)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 gap-1 px-1.5 text-[9px]"
                onClick={handleCopy}
              >
                <CopyIcon className="size-3" />
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy file content</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Find bar */}
      {findOpen && (
        <div className="flex h-7 shrink-0 items-center gap-2 border-b border-border/40 px-3 bg-background/80">
          <SearchIcon className="size-3 text-muted-foreground/50" />
          <Input
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find..."
            className="h-5 w-48 border-0 bg-transparent p-0 text-[10px] focus-visible:ring-0"
            autoFocus
          />
          {findQuery && (
            <span className="font-mono text-[9px] text-muted-foreground/60">
              {matchLines.size} {matchLines.size === 1 ? "match" : "matches"}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-4 p-0"
            onClick={() => { setFindOpen(false); setFindQuery(""); }}
          >
            <XIcon className="size-2.5" />
          </Button>
        </div>
      )}

      {/* Code content */}
      <div className="flex-1 overflow-auto bg-background/50">
        <pre className="min-w-max font-mono text-[11px] leading-[1.6] text-foreground/85">
          <code>
            {lines.map((line, index) => {
              const isMatch = matchLines.has(index);
              return (
                <span
                  key={`${file.path}-${index}`}
                  className={`grid grid-cols-[3.5rem_minmax(0,1fr)] ${
                    isMatch
                      ? "bg-synth-cyan/10"
                      : "hover:bg-synth-cyan/[0.03]"
                  }`}
                >
                  <span className="select-none pr-3 text-right text-muted-foreground/30">
                    {formatLineNumber(index + 1, lineNumberWidth)}
                  </span>
                  <span className="whitespace-pre pr-4">{line || " "}</span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>

      {/* Status bar */}
      <div className="flex h-5 shrink-0 items-center justify-between border-t border-border/40 bg-background/80 px-3">
        <div className="flex items-center gap-3 text-[8px] text-muted-foreground/60">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-synth-success/60" />
            Read-only
          </span>
          <span>{file.language}</span>
          <span>{lines.length} lines</span>
          <span>{(file.byteSize / 1024).toFixed(1)} KB</span>
        </div>
        <span className="font-mono text-[8px] text-muted-foreground/40">SYNTH Code</span>
      </div>
    </div>
  );
}
