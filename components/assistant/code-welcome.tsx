"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";
import { getAgentDisplayName } from "@/lib/ai/synth-agents";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import type { ModuleActionState } from "@/components/modules/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CodeChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLabel?: string;
  timestamp: number;
}

interface CodeWelcomeProps {
  project: ProjectInfo | null;
  messages: CodeChatMessage[];
  isBusy: boolean;
  output?: string;
  error?: string;
  model?: string;
  actionState?: ModuleActionState;
  onSendMessage: (message: string) => void;
  onQuickAction?: (action: string) => void;
  onOpenFiles: () => void;
}

/* ------------------------------------------------------------------ */
/*  Suggestion chips                                                   */
/* ------------------------------------------------------------------ */

interface Suggestion {
  id: string;
  label: string;
  icon: string;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "explain", label: "Explain this project", icon: "lightbulb" },
  { id: "review", label: "Review for bugs", icon: "bug" },
  { id: "refactor", label: "Suggest refactors", icon: "sparkles" },
  { id: "docs", label: "Generate docs", icon: "bookOpen" },
  { id: "browse", label: "Browse files", icon: "files" },
  { id: "responsive", label: "Make responsive", icon: "panelRight" },
];

/* ------------------------------------------------------------------ */
/*  Auto-resize textarea                                               */
/* ------------------------------------------------------------------ */

function useAutoResize(min: number, max: number) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjust = useCallback(
    (reset?: boolean) => {
      const el = ref.current;
      if (!el) return;
      if (reset) {
        el.style.height = `${min}px`;
        return;
      }
      el.style.height = `${min}px`;
      el.style.height = `${Math.max(min, Math.min(el.scrollHeight, max))}px`;
    },
    [min, max],
  );

  useEffect(() => {
    if (ref.current) ref.current.style.height = `${min}px`;
  }, [min]);

  return { ref, adjust };
}

/* ------------------------------------------------------------------ */
/*  CodeWelcome — v0-style center chat panel                           */
/* ------------------------------------------------------------------ */

export function CodeWelcome({
  project,
  messages,
  isBusy,
  output,
  error,
  model,
  actionState,
  onSendMessage,
  onQuickAction,
  onOpenFiles,
}: CodeWelcomeProps) {
  const [input, setInput] = useState("");
  const { ref: textareaRef, adjust } = useAutoResize(44, 140);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, output, isBusy]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isBusy) return;
    onSendMessage(input.trim());
    setInput("");
    adjust(true);
  }, [input, isBusy, onSendMessage, adjust]);

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
  const PaperclipIcon = iconFor("paperclip");
  const GlobeIcon = iconFor("globe");
  const SparklesIcon = iconFor("sparkles");
  const CodeIcon = iconFor("code-2");
  const MicIcon = iconFor("mic");

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      {/* Scrollable message area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {hasMessages ? (
          /* ---- Active conversation ---- */
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
            {messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}

            {/* Assistant streaming output */}
            {isBusy && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-synth-cyan/10">
                  <ThinkingOrb state="weaving" size={20} theme="dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-foreground">
                      SYNTH Forge
                    </span>
                    {actionState === "loading" && (
                      <span className="text-[9px] text-muted-foreground/50">thinking...</span>
                    )}
                  </div>
                  {output && output.length > 0 ? (
                    <div className="mt-1.5 rounded-lg border border-border/60 bg-white/[0.02] p-3 font-mono text-[11px] leading-5 text-foreground/85">
                      <FormattedOutput text={output} />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="size-1.5 animate-pulse rounded-full bg-synth-violet/60" />
                      <span className="text-[10px] text-muted-foreground/50">Analyzing...</span>
                    </div>
                  )}
                  {error && (
                    <div className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-[10px] text-destructive">
                      {error}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Previous assistant output */}
            {!isBusy &&
              messages.length > 0 &&
              messages[messages.length - 1].role === "user" &&
              output &&
              output.length > 0 && (
                <div className="flex gap-3">
                  <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-synth-cyan/10">
                    <ThinkingOrb state="connecting" size={20} theme="dark" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-foreground">
                      SYNTH Forge
                    </span>
                    <div className="mt-1.5 rounded-lg border border-border/60 bg-white/[0.02] p-3 font-mono text-[11px] leading-5 text-foreground/85">
                      <FormattedOutput text={output} />
                    </div>
                  </div>
                </div>
              )}
          </div>
        ) : (
          /* ---- Welcome / empty state ---- */
          <div className="flex flex-1 flex-col items-center justify-center px-4 pt-[15vh]">
            {/* Orb */}
            <div className="pointer-events-none relative mb-5">
              <div className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--synth-cyan)_8%,transparent),transparent_70%)] blur-3xl" />
              <ThinkingOrb state="searching" size={64} theme="dark" />
            </div>

            {/* Title */}
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              SYNTH <span className="text-synth-cyan">Code</span>
            </h1>

            {project && (
              <p className="mt-2 max-w-md text-center font-mono text-[10px] text-muted-foreground/50">
                {project.name} · {project.language} · {project.fileCount} files
              </p>
            )}

            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground/60">
              Build something amazing — just start typing below.
            </p>
          </div>
        )}
      </div>

      {/* ---- Composer section ---- */}
      <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-xl">
        {/* Suggestion chips — only when no messages */}
        {!hasMessages && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-4 pt-3 pb-1">
            {SUGGESTIONS.map((s) => {
              const SIcon = iconFor(s.icon);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5",
                    "text-[11px] text-muted-foreground/70 transition-all",
                    "hover:border-synth-cyan/30 hover:bg-synth-cyan/[0.06] hover:text-foreground",
                  )}
                  onClick={() => handleSuggestion(s)}
                >
                  <SIcon className="size-3" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Input box */}
        <div className="mx-auto max-w-3xl px-4 pb-4 pt-2 sm:px-6">
          <div className="relative rounded-xl border border-white/[0.08] bg-white/[0.03] shadow-lg backdrop-blur-xl">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjust();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Describe what you want to build..."
              className={cn(
                "w-full resize-none border-none bg-transparent px-4 pt-3 pb-2 text-sm text-foreground",
                "placeholder:text-muted-foreground/40 focus:outline-none",
                "min-h-[44px]",
              )}
              style={{ overflow: "hidden" }}
            />

            {/* Bottom row: actions + send */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              {/* Left action buttons */}
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/40 hover:text-foreground"
                >
                  <PaperclipIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/40 hover:text-foreground"
                >
                  <GlobeIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/40 hover:text-foreground"
                >
                  <SparklesIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/40 hover:text-foreground"
                >
                  <CodeIcon className="size-3.5" />
                </Button>
              </div>

              {/* Right: mic + send */}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground/40 hover:text-foreground"
                >
                  <MicIcon className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  disabled={!input.trim() || isBusy}
                  className={cn(
                    "size-7 rounded-lg transition-all",
                    input.trim() && !isBusy
                      ? "bg-synth-cyan text-black hover:bg-synth-cyan/80"
                      : "bg-white/[0.06] text-muted-foreground/30",
                  )}
                  onClick={handleSend}
                >
                  <SendIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom hint */}
          <p className="mt-2 text-center text-[9px] text-muted-foreground/30">
            Enter to send · Shift+Enter for new line · {project?.adapterType === "github" ? "GitHub connected" : "Local project"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message row                                                        */
/* ------------------------------------------------------------------ */

function MessageRow({ message }: { message: CodeChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className={cn(
          "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-white/[0.06]" : "bg-synth-cyan/10",
        )}
      >
        {isUser ? (
          <span className="text-[10px] font-bold text-foreground/70">U</span>
        ) : (
          <span className="text-[10px] font-bold text-synth-cyan">S</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">
            {isUser ? "You" : "SYNTH Forge"}
          </span>
          {message.actionLabel && (
            <Badge
              variant="outline"
              className={cn(
                "h-4 px-1 text-[7px]",
                isUser
                  ? "border-synth-cyan/20 text-synth-cyan"
                  : "border-synth-violet/20 text-synth-violet",
              )}
            >
              {message.actionLabel}
            </Badge>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/85">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formatted output with code blocks                                  */
/* ------------------------------------------------------------------ */

function FormattedOutput({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const inner = part.slice(3, -3);
          const nl = inner.indexOf("\n");
          const lang = nl > 0 ? inner.slice(0, nl).trim() : "";
          const code = nl > 0 ? inner.slice(nl + 1) : inner;
          return (
            <div key={i} className="my-2 rounded-md border border-border/50 bg-background/60 p-2.5">
              {lang && (
                <div className="mb-1 border-b border-border/40 pb-1 text-[8px] uppercase tracking-wider text-muted-foreground/50">
                  {lang}
                </div>
              )}
              <pre className="overflow-x-auto text-[10px] leading-4">{code}</pre>
            </div>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap text-[13px] leading-relaxed">
            {part}
          </span>
        );
      })}
    </>
  );
}
