"use client";

import { useCallback, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
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
}

const SUGGESTIONS: Suggestion[] = [
  { id: "explain", label: "Explain Project", icon: "lightbulb" },
  { id: "review", label: "Review Code", icon: "gitCompare" },
  { id: "browse", label: "Browse Files", icon: "files" },
  { id: "responsive", label: "Make Responsive", icon: "panelRight" },
];

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  recentFiles?: string[];
  onSendMessage: (message: string) => void;
  onQuickAction?: (action: string) => void;
  onOpenFiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  CodeWelcome — cinematic welcome with ThinkingOrb                    */
/* ------------------------------------------------------------------ */

export function CodeWelcome({
  project,
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
    if (textareaRef.current) textareaRef.current.style.height = "44px";
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
  const PlusIcon = iconFor("plus");
  const SparkleIcon = iconFor("sparkles");

  return (
    <div className="flex h-full min-w-0 flex-col items-center justify-center bg-[#080a12] px-4 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(45,212,191,0.06)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.04)_0%,transparent_70%)] blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full">
        {/* ThinkingOrb */}
        <div className="mb-6 pointer-events-none">
          <ThinkingOrb state="listening" size={64} theme="dark" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white tracking-tight sm:text-3xl mb-1">
          SYNTH Code
        </h1>
        <p className="text-[13px] text-white/40 mb-4">
          Your AI development workspace
        </p>

        {/* Project info */}
        {project && (
          <div className="flex items-center gap-2 mb-6 text-[10px] text-white/30">
            <span>{project.name}</span>
            <span className="text-white/10">·</span>
            <span>{project.language}</span>
            <span className="text-white/10">·</span>
            <span>{project.fileCount} files</span>
          </div>
        )}

        {/* Composer — glass morphism with gradient border */}
        <div className="w-full max-w-xl mb-5">
          <div className="relative rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Gradient top edge */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#2dd4bf]/40 to-transparent" />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "44px";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want SYNTH Forge to build..."
              className={cn(
                "w-full resize-none border-none bg-transparent px-5 pt-4 pb-2 text-[14px] text-white/90",
                "placeholder:text-white/30 focus:outline-none",
                "min-h-[44px]",
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Bottom action row */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <PlusIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <SparkleIcon className="size-4" />
                </Button>
              </div>
              <Button
                type="button"
                size="icon"
                disabled={!input.trim()}
                className={cn(
                  "size-8 rounded-xl transition-all duration-200",
                  input.trim()
                    ? "bg-[#2dd4bf] text-[#080a12] hover:bg-[#2dd4bf]/80 shadow-lg shadow-[#2dd4bf]/20"
                    : "bg-white/[0.06] text-white/20",
                )}
                onClick={handleSend}
              >
                <SendIcon className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Quick action chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          {SUGGESTIONS.map((s) => {
            const SIcon = iconFor(s.icon);
            return (
              <button
                key={s.id}
                type="button"
                className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[12px] text-white/50 transition-all hover:border-[#2dd4bf]/30 hover:bg-[#2dd4bf]/[0.06] hover:text-white/80"
                onClick={() => handleSuggestion(s)}
              >
                <SIcon className="size-3.5" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Hint */}
        <p className="text-[10px] text-white/20">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
