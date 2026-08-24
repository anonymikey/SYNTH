"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconFor } from "@/lib/icons";

export interface DiffHunk {
  filePath: string;
  language?: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: "add" | "remove" | "context";
  content: string;
  oldLine?: number;
  newLine?: number;
}

interface DiffViewProps {
  hunks: DiffHunk[];
  onCopy?: (filePath: string) => void;
}

export function DiffView({ hunks, onCopy }: DiffViewProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
    new Set(hunks.map((h) => h.filePath)),
  );

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const totalAdditions = hunks.reduce((sum, h) => sum + h.additions, 0);
  const totalDeletions = hunks.reduce((sum, h) => sum + h.deletions, 0);

  if (hunks.length === 0) return null;

  return (
    <div className="rounded-lg border border-synth-violet/20 bg-synth-violet/5">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-synth-violet/15 px-3 py-2">
        <span className="text-[10px] font-semibold text-synth-violet">Proposed Changes</span>
        <Badge variant="outline" className="h-3.5 border-synth-violet/20 px-1 text-[7px] text-synth-violet">
          {hunks.length} {hunks.length === 1 ? "file" : "files"}
        </Badge>
        <div className="flex items-center gap-1 text-[8px]">
          <span className="text-synth-success">+{totalAdditions}</span>
          <span className="text-destructive">-{totalDeletions}</span>
        </div>
      </div>

      {/* Files */}
      <ScrollArea className="max-h-[300px]">
        <div className="divide-y divide-synth-violet/10">
          {hunks.map((hunk) => {
            const isExpanded = expandedFiles.has(hunk.filePath);
            const fileName = hunk.filePath.split("/").pop() ?? hunk.filePath;
            const ChevronIcon = iconFor("chevronDown");

            return (
              <div key={hunk.filePath}>
                {/* File header */}
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-synth-violet/5"
                  onClick={() => toggleFile(hunk.filePath)}
                >
                  <ChevronIcon
                    className={`size-3 shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? "" : "-rotate-90"
                    }`}
                  />
                  <span className="truncate text-[10px] font-medium text-foreground">
                    {fileName}
                  </span>
                  <span className="font-mono text-[8px] text-muted-foreground/50">
                    {hunk.filePath}
                  </span>
                  <div className="flex-1" />
                  <span className="text-[8px] text-synth-success">+{hunk.additions}</span>
                  <span className="text-[8px] text-destructive">-{hunk.deletions}</span>
                  {onCopy && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-4 p-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy(hunk.filePath);
                      }}
                    >
                      <span className="text-[7px] text-muted-foreground">Copy</span>
                    </Button>
                  )}
                </button>

                {/* Diff lines */}
                {isExpanded && (
                  <div className="border-t border-synth-violet/10 bg-background/50">
                    {hunk.lines.map((line, i) => (
                      <div
                        key={i}
                        className={`flex font-mono text-[9px] leading-5 ${
                          line.type === "add"
                            ? "bg-synth-success/10 text-synth-success"
                            : line.type === "remove"
                              ? "bg-destructive/10 text-destructive"
                              : "text-muted-foreground"
                        }`}
                      >
                        <span className="w-8 shrink-0 select-none px-1 text-right text-muted-foreground/30">
                          {line.oldLine ?? ""}
                        </span>
                        <span className="w-8 shrink-0 select-none px-1 text-right text-muted-foreground/30">
                          {line.newLine ?? ""}
                        </span>
                        <span className="w-4 shrink-0 select-none text-center text-muted-foreground/30">
                          {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
                        </span>
                        <span className="min-w-0 flex-1 whitespace-pre px-2">{line.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="flex items-center gap-2 border-t border-synth-violet/15 px-3 py-2">
        <span className="text-[8px] text-muted-foreground">
          Changes are proposed, not applied.
        </span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-5 gap-1 px-2 text-[8px] text-muted-foreground"
          disabled
        >
          Apply
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 gap-1 px-2 text-[8px] text-muted-foreground"
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
