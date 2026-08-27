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
  const [currentLine, setCurrentLine] = useState<number | null>(null);

  const handleCopy = async () => {
    if (!file) return;
    await navigator.clipboard.writeText(file.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Lines must be computed outside conditional to keep hooks stable
  const lines = useMemo(() => file ? file.content.split("\n") : [], [file]);
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

  // Language display
  const languageDisplay = file?.language ?? "text";

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full flex-col bg-[#11151d]">
        <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/[.06] px-3">
          <div className="size-2.5 animate-spin rounded-full border-2 border-[#2dd4bf]/30 border-t-[#2dd4bf]" />
          <span className="text-[9px] text-white/30">Reading file...</span>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-1.5">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="h-3.5 rounded bg-white/[0.02]"
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
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center bg-[#11151d]">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#2dd4bf]/10 text-[#2dd4bf]">
          <CodeIcon className="size-5" />
        </div>
        <div>
          <p className="text-[12px] font-medium text-white/60">Select a file to inspect</p>
          <p className="mt-0.5 text-[10px] text-white/25">
            Choose a file from the explorer to view its contents.
          </p>
        </div>
        <p className="font-mono text-[8px] text-white/15">
          SYNTH Code — Read-only workspace
        </p>
      </div>
    );
  }

  const CopyIcon = iconFor(copied ? "check" : "clipboard");
  const SearchIcon = iconFor("search");
  const XIcon = iconFor("x");

  return (
    <div className="flex h-full min-w-0 flex-col bg-[#11151d]">
      {/* File header bar */}
      <div className="flex h-7 shrink-0 items-center gap-2 border-b border-white/[.06] px-3">
        <span className="truncate text-[10px] font-medium text-white/70">{file.path}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {/* Language badge */}
          <Badge
            variant="outline"
            className="hidden text-[7px] uppercase tracking-wider sm:inline-flex border-white/[0.06] text-white/30"
          >
            {languageDisplay}
          </Badge>
          <Badge
            variant="outline"
            className={`hidden text-[7px] uppercase tracking-wider sm:inline-flex ${
              adapterType === "local"
                ? "border-green-500/25 text-green-400/70"
                : adapterType === "github"
                  ? "border-blue-500/25 text-blue-400/70"
                  : "border-[#9670ff]/25 text-[#9670ff]/70"
            }`}
          >
            {adapterType}
          </Badge>
          <span className="font-mono text-[7px] text-white/20">
            {lines.length} lines
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 gap-0.5 px-1 text-[8px] text-white/25 hover:text-white/50"
                onClick={() => setFindOpen((o) => !o)}
              >
                <SearchIcon className="size-2.5" />
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
                className="h-4 gap-0.5 px-1 text-[8px] text-white/25 hover:text-white/50"
                onClick={handleCopy}
              >
                <CopyIcon className="size-2.5" />
                <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy file content</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Find bar */}
      {findOpen && (
        <div className="flex h-6 shrink-0 items-center gap-2 border-b border-white/[.06] px-3 bg-[#0c0e16]/80">
          <SearchIcon className="size-2.5 text-white/20" />
          <Input
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            placeholder="Find..."
            className="h-4 w-40 border-0 bg-transparent p-0 text-[9px] text-white/60 placeholder:text-white/20 focus-visible:ring-0"
            autoFocus
          />
          {findQuery && (
            <span className="font-mono text-[8px] text-white/25">
              {matchLines.size} {matchLines.size === 1 ? "match" : "matches"}
            </span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto h-3 p-0"
            onClick={() => { setFindOpen(false); setFindQuery(""); }}
          >
            <XIcon className="size-2" />
          </Button>
        </div>
      )}

      {/* Code content */}
      <div className="flex-1 overflow-auto">
        <pre className="min-w-max font-mono text-[11px] leading-[1.65] text-white/70">
          <code>
            {lines.map((line, index) => {
              const isMatch = matchLines.has(index);
              const isCurrent = currentLine === index + 1;
              return (
                <span
                  key={`${file.path}-${index}`}
                  className={`grid grid-cols-[3rem_minmax(0,1fr)] ${
                    isMatch
                      ? "bg-[#2dd4bf]/[0.08]"
                      : isCurrent
                        ? "bg-white/[0.03]"
                        : "hover:bg-white/[0.02]"
                  }`}
                  onMouseEnter={() => setCurrentLine(index + 1)}
                  onMouseLeave={() => setCurrentLine(null)}
                >
                  <span className="select-none pr-3 text-right text-white/15">
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
      <div className="flex h-4 shrink-0 items-center justify-between border-t border-white/[.06] bg-[#0c0e16] px-3">
        <div className="flex items-center gap-2.5 text-[7px] text-white/20">
          <span className="flex items-center gap-1">
            <span className="size-1 rounded-full bg-green-400/50" />
            Read-only
          </span>
          <span>{languageDisplay}</span>
          <span>{lines.length} lines</span>
          <span>{(file.byteSize / 1024).toFixed(1)} KB</span>
        </div>
        <span className="font-mono text-[7px] text-white/15">SYNTH Code</span>
      </div>
    </div>
  );
}
