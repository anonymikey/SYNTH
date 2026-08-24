"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProjectInfo } from "@/lib/project/use-project";
import {
  Code2,
  Bug,
  Sparkles,
  BookOpen,
  GitCompare,
  Paperclip,
  ArrowUpIcon,
  Rocket,
  Layers,
  Palette,
  MonitorIcon,
  FileUp,
  ImageIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Auto-resize textarea hook                                          */
/* ------------------------------------------------------------------ */

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

/* ------------------------------------------------------------------ */
/*  Quick action chips                                                 */
/* ------------------------------------------------------------------ */

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const QUICK_ACTIONS: QuickAction[] = [
  { id: "browse", label: "Browse Files", icon: <Layers className="size-4" /> },
  { id: "explain", label: "Explain Code", icon: <Code2 className="size-4" /> },
  { id: "review", label: "Review Code", icon: <GitCompare className="size-4" /> },
  { id: "bugs", label: "Find Bugs", icon: <Bug className="size-4" /> },
  { id: "refactor", label: "Refactor", icon: <Sparkles className="size-4" /> },
  { id: "docs", label: "Generate Docs", icon: <BookOpen className="size-4" /> },
  { id: "launch", label: "Launch App", icon: <Rocket className="size-4" /> },
  { id: "theme", label: "Theme Ideas", icon: <Palette className="size-4" /> },
  { id: "landing", label: "Landing Page", icon: <MonitorIcon className="size-4" /> },
  { id: "upload", label: "Upload Docs", icon: <FileUp className="size-4" /> },
  { id: "assets", label: "Image Assets", icon: <ImageIcon className="size-4" /> },
];

/* ------------------------------------------------------------------ */
/*  CodeWelcome component                                              */
/* ------------------------------------------------------------------ */

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  onOpenFiles: () => void;
  onQuickAction?: (action: string) => void;
  onSendMessage?: (message: string) => void;
}

export function CodeWelcome({ project, onOpenFiles, onQuickAction, onSendMessage }: CodeWelcomeProps) {
  const [message, setMessage] = useState("");
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 150 });

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    if (onSendMessage) {
      onSendMessage(message.trim());
    } else {
      onQuickAction?.(message.trim());
    }
    setMessage("");
    adjustHeight(true);
  }, [message, adjustHeight, onSendMessage, onQuickAction]);

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
      } else {
        onQuickAction?.(action.id);
      }
    },
    [onOpenFiles, onQuickAction],
  );

  return (
    <div
      className="relative flex h-full flex-col items-center overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse 80% 50% at 50% 60%, color-mix(in srgb, var(--synth-cyan) 15%, transparent), transparent),
          radial-gradient(ellipse 60% 40% at 50% 55%, color-mix(in srgb, #1a1a3e 60%, transparent), transparent),
          var(--background)
        `,
      }}
    >
      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in srgb, var(--synth-cyan) 30%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--synth-cyan) 30%, transparent) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Horizon glow line */}
      <div className="pointer-events-none absolute left-0 right-0 top-[45%] h-px bg-gradient-to-r from-transparent via-synth-cyan/20 to-transparent" />
      <div className="pointer-events-none absolute left-1/4 right-1/4 top-[44%] h-8 -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--synth-cyan)_8%,transparent),transparent)] blur-xl" />

      {/* Center content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4">
        {/* Orb */}
        <div className="pointer-events-none relative mb-6">
          <div className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--synth-cyan)_10%,transparent),transparent_70%)] blur-3xl" />
          <ThinkingOrb state="searching" size={64} theme="dark" />
        </div>

        {/* Title */}
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          SYNTH <span className="text-synth-cyan">Code</span>
        </h1>

        {/* Project info */}
        {project && (
          <p className="mt-2 max-w-md text-center font-mono text-xs text-muted-foreground">
            {project.name} · {project.language} · {project.fileCount} files
          </p>
        )}

        <p className="mt-2 max-w-md text-center text-sm text-muted-foreground/80">
          Build something amazing — just start typing below.
        </p>
      </div>

      {/* Input section — pinned near bottom */}
      <div className="relative z-10 w-full max-w-3xl px-4 pb-[12vh] sm:pb-[16vh]">
        {/* Glass input box */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-black/50 shadow-2xl backdrop-blur-xl">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build..."
            className={cn(
              "w-full resize-none border-none bg-transparent px-4 pt-4 pb-2 text-sm text-foreground",
              "placeholder:text-muted-foreground/40 focus:outline-none",
              "min-h-[48px]",
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Footer: attach + send */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground/50 hover:text-foreground"
              >
                <Paperclip className="size-4" />
              </Button>
            </div>

            <Button
              type="button"
              size="icon"
              disabled={!message.trim()}
              className={cn(
                "size-8 rounded-lg transition-all",
                message.trim()
                  ? "bg-synth-cyan text-black hover:bg-synth-cyan/80"
                  : "bg-white/[0.06] text-muted-foreground/30",
              )}
              onClick={handleSend}
            >
              <ArrowUpIcon className="size-4" />
            </Button>
          </div>
        </div>

        {/* Quick action chips */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5",
                "text-xs text-muted-foreground/70 transition-all",
                "hover:border-synth-cyan/30 hover:bg-synth-cyan/[0.06] hover:text-foreground",
              )}
              onClick={() => handleQuickAction(action)}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-wider text-muted-foreground/30">
          Enter to send · Shift+Enter for new line · Select a file to begin
        </p>
      </div>
    </div>
  );
}
