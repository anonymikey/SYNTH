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

interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "explain", label: "Explain Project", prompt: "Explain this project's architecture, purpose, and key components.", icon: "lightbulb" },
  { id: "review", label: "Review Code", prompt: "Review the codebase for bugs, code smells, and maintainability issues.", icon: "gitCompare" },
  { id: "browse", label: "Browse Files", prompt: "Browse Files", icon: "files" },
  { id: "responsive", label: "Make Responsive", prompt: "Analyze the project and suggest responsive design improvements.", icon: "globe" },
];

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  recentFiles?: string[];
  onSendMessage: (message: string) => void;
  onQuickAction?: (action: string) => void;
  onOpenFiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  CodeWelcome — Ready state with ORB, composer, and quick actions    */
/* ------------------------------------------------------------------ */

export function CodeWelcome({
  project,
  onSendMessage,
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

  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      if (action.id === "browse") {
        onOpenFiles();
        return;
      }
      onSendMessage(action.prompt);
    },
    [onSendMessage, onOpenFiles],
  );

  const SendIcon = iconFor("arrowUp");
  const PlusIcon = iconFor("plus");
  const SparkleIcon = iconFor("sparkles");

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-[#080a12] overflow-hidden relative">
      {/* Ambient background glow — breathing animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-3xl animate-[breathe_6s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)" }}
        />
        <div
          className="absolute left-[55%] top-[50%] -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full blur-3xl animate-[breathe_8s_ease-in-out_infinite_2s]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center w-full max-w-2xl mx-auto px-4 animate-fade-in">
        {/* ORB */}
        <div className="mb-4 pointer-events-none">
          <ThinkingOrb state="listening" size={64} theme="dark" />
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-1 text-center">
          SYNTH Code
        </h1>
        <p className="text-[13px] text-white/35 mb-4 text-center">
          Your AI development workspace
        </p>

        {/* Project info */}
        {project && (
          <div className="flex items-center gap-2 mb-6 text-[10px] text-white/25">
            <span className="font-medium">{project.name}</span>
            <span className="text-white/10">·</span>
            <span>{project.language}</span>
            <span className="text-white/10">·</span>
            <span>{project.fileCount} files</span>
            {project.adapterType && (
              <span className={cn(
                "px-1.5 py-0.5 rounded text-[8px] uppercase tracking-wider",
                project.adapterType === "github" ? "bg-blue-500/10 text-blue-400" : "bg-synth-cyan/10 text-synth-cyan"
              )}>
                {project.adapterType}
              </span>
            )}
          </div>
        )}
        {!project && <div className="mb-6" />}

        {/* Composer — visually dominant but compact */}
        <div className="w-full max-w-xl mb-4">
          <div className="relative rounded-xl bg-[#14161e]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden transition-all hover:border-white/[0.12]">
            {/* Gradient top edge */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/50 via-[#2dd4bf]/40 to-cyan-500/50" />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "44px";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="What are you building?"
              className={cn(
                "w-full resize-none border-none bg-transparent px-4 pt-3.5 pb-2 text-[14px] text-white/90",
                "placeholder:text-white/25 focus:outline-none",
                "min-h-[44px]",
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Bottom action row */}
            <div className="flex items-center justify-between px-3.5 pb-2.5">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <PlusIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/25 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <SparkleIcon className="size-3.5" />
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

        {/* Quick actions — subtle, compact */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
          {QUICK_ACTIONS.map((action) => {
            const ActionIcon = iconFor(action.icon);
            return (
              <button
                key={action.id}
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/45 transition-all hover:border-[#2dd4bf]/20 hover:bg-[#2dd4bf]/[0.05] hover:text-white/70"
                onClick={() => handleQuickAction(action)}
              >
                <ActionIcon className="size-3" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] text-white/15">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
