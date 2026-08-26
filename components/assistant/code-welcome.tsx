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
  { id: "create-website", label: "Create a website", icon: "globe" },
  { id: "build-app", label: "Build a mobile app", icon: "blocks" },
  { id: "design-dashboard", label: "Design a dashboard", icon: "dashboard" },
];

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  recentFiles?: string[];
  onSendMessage: (message: string) => void;
  onQuickAction?: (action: string) => void;
  onOpenFiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  CodeWelcome — cinematic welcome matching Codient reference         */
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
      const prompts: Record<string, string> = {
        "create-website":
          "Create a responsive website with a hero section, features, pricing, and CTA.",
        "build-app":
          "Build a mobile app with navigation, screens, and a clean UI.",
        "design-dashboard":
          "Design a dashboard with analytics cards, charts, and a sidebar.",
      };
      onSendMessage(prompts[s.id] || s.label);
    },
    [onSendMessage],
  );

  const SendIcon = iconFor("arrowUp");
  const PlusIcon = iconFor("plus");
  const SparkleIcon = iconFor("sparkles");
  const PaperclipIcon = iconFor("paperclip");
  const WrenchIcon = iconFor("wrench");

  return (
    <div className="w-full max-w-3xl px-4 py-12 flex flex-col items-center justify-center min-h-full relative bg-[#080a12]">
      {/* Ambient background glow — breathing animation */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full blur-3xl animate-[breathe_6s_ease-in-out_infinite]" style={{ background: "radial-gradient(circle, rgba(45,212,191,0.12) 0%, transparent 70%)" }} />
        <div className="absolute left-[55%] top-[45%] -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full blur-3xl animate-[breathe_8s_ease-in-out_infinite_2s]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
        <div className="absolute left-[45%] top-[60%] -translate-x-1/2 -translate-y-1/2 h-[350px] w-[350px] rounded-full blur-3xl animate-[breathe_7s_ease-in-out_infinite_1s]" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl w-full mx-auto">
        {/* ThinkingOrb */}
        <div className="mb-5 pointer-events-none">
          <ThinkingOrb state="listening" size={64} theme="dark" />
        </div>

        {/* Main heading — matches reference */}
        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2 text-center">
          What do you want to build?
        </h1>

        {/* Project info */}
        {project && (
          <div className="flex items-center gap-2 mt-2 mb-6 text-[10px] text-white/30">
            <span>{project.name}</span>
            <span className="text-white/10">·</span>
            <span>{project.language}</span>
            <span className="text-white/10">·</span>
            <span>{project.fileCount} files</span>
          </div>
        )}

        {!project && <div className="mb-6" />}

        {/* Suggestion chips — matching reference style */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="rounded-full border border-white/[0.12] bg-white/[0.04] px-4 py-2 text-[13px] text-white/60 transition-all hover:border-[#2dd4bf]/30 hover:bg-[#2dd4bf]/[0.08] hover:text-white/90"
              onClick={() => handleSuggestion(s)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Composer — glass morphism matching reference */}
        <div className="w-full max-w-xl mb-5">
          <div className="relative rounded-2xl bg-[#14161e]/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl overflow-hidden">
            {/* Gradient top edge — green-to-cyan like reference */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/60 via-[#2dd4bf]/50 to-cyan-500/60" />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "44px";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask a follow-up..."
              className={cn(
                "w-full resize-none border-none bg-transparent px-5 pt-4 pb-2 text-[14px] text-white/90",
                "placeholder:text-white/25 focus:outline-none",
                "min-h-[44px]",
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Bottom action row */}
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1.5">
                {/* Attach */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <PlusIcon className="size-4" />
                </Button>
                {/* Sparkle / AI */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/[0.05]"
                >
                  <SparkleIcon className="size-4" />
                </Button>
                {/* Builder button — matching reference */}
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                  onClick={() => {
                    onSendMessage(input.trim() || "Open the builder");
                    setInput("");
                  }}
                >
                  <WrenchIcon className="size-3" />
                  <span>Builder</span>
                </button>
              </div>
              {/* Send button */}
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

        {/* Keyboard hint */}
        <p className="text-[10px] text-white/20">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
