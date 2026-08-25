"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Suggestion {
  id: string;
  label: string;
  icon: string;
  desc: string;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "explain", label: "Explain Project", icon: "lightbulb", desc: "Understand the architecture" },
  { id: "review", label: "Review Code", icon: "gitCompare", desc: "Find issues and smells" },
  { id: "browse", label: "Browse Files", icon: "files", desc: "Explore the file tree" },
  { id: "responsive", label: "Make Responsive", icon: "panelRight", desc: "Improve mobile layout" },
];

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  recentFiles?: string[];
  onSendMessage: (message: string) => void;
  onQuickAction?: (action: string) => void;
  onOpenFiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  CodeWelcome — compact welcome state with composer                   */
/* ------------------------------------------------------------------ */

export function CodeWelcome({
  project,
  recentFiles = [],
  onSendMessage,
  onQuickAction,
  onOpenFiles,
}: CodeWelcomeProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
  }, [input, onSendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestion = useCallback(
    (s: Suggestion) => {
      if (s.id === "browse") {
        onOpenFiles();
      } else {
        onQuickAction?.(s.id);
      }
    },
    [onOpenFiles, onQuickAction],
  );

  const SendIcon = iconFor("arrowUp");

  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center bg-background px-4">
      {/* Title + description */}
      <div className="mb-6 text-center">
        <h1 className="font-heading text-lg font-semibold text-foreground sm:text-xl">
          SYNTH Code
        </h1>
        <p className="mt-1 text-[11px] text-muted-foreground/60">
          Your AI development workspace
        </p>
      </div>

      {/* Project info */}
      {project && (
        <div className="mb-5 flex items-center gap-3 text-[10px] text-muted-foreground/50">
          <span>{project.name}</span>
          <span className="text-muted-foreground/20">·</span>
          <span>{project.language}</span>
          <span className="text-muted-foreground/20">·</span>
          <span>{project.fileCount} files</span>
        </div>
      )}

      {/* Recent files */}
      {recentFiles.length > 0 && (
        <div className="mb-5 w-full max-w-md">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/40">
            Recent files
          </p>
          <div className="space-y-0.5">
            {recentFiles.slice(0, 5).map((fp: string) => (
              <button
                key={fp}
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] text-muted-foreground/70 hover:bg-white/[0.03] hover:text-foreground"
                onClick={() => onQuickAction?.(`open:${fp}`)}
              >
                <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/20" />
                <span className="truncate font-mono text-[10px]">{fp}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick action cards */}
      <div className="mb-6 grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
        {SUGGESTIONS.map((s) => {
          const SIcon = iconFor(s.icon);
          return (
            <button
              key={s.id}
              type="button"
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-lg border border-border/30 bg-white/[0.01] p-3 text-center transition-colors",
                "hover:border-synth-violet/30 hover:bg-synth-violet/[0.04]",
              )}
              onClick={() => handleSuggestion(s)}
            >
              <SIcon className="size-4 text-muted-foreground/50" />
              <span className="text-[10px] font-medium text-foreground/80">{s.label}</span>
              <span className="text-[8px] text-muted-foreground/40">{s.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <div className="w-full max-w-3xl">
        <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-lg backdrop-blur-xl">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "40px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className={cn(
              "w-full resize-none border-none bg-transparent px-4 pt-3 pb-2 text-sm text-foreground",
              "placeholder:text-muted-foreground/40 focus:outline-none",
              "min-h-[40px]",
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Bottom row */}
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-0.5">
              <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground/30 hover:text-foreground">
                <span className="text-[10px]">+</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground/30 hover:text-foreground">
                {(() => { const I = iconFor("paperclip"); return <I className="size-3" />; })()}
              </Button>
            </div>
            <Button
              type="button"
              size="icon"
              disabled={!input.trim()}
              className={cn(
                "size-7 rounded-lg transition-all",
                input.trim()
                  ? "bg-synth-cyan text-black hover:bg-synth-cyan/80"
                  : "bg-white/[0.05] text-muted-foreground/25",
              )}
              onClick={handleSend}
            >
              <SendIcon className="size-3.5" />
            </Button>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[8px] text-muted-foreground/30">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
