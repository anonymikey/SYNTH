"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";
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
  recentFiles?: string[];
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
/*  Suggestions                                                        */
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

/* ------------------------------------------------------------------ */
/*  CodeWelcome — compact no-file state                                */
/* ------------------------------------------------------------------ */

export function CodeWelcome({
  project,
  recentFiles = [],
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMessages = messages.length > 0;

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, output, isBusy]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isBusy) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";
  }, [input, isBusy, onSendMessage]);

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
  const SearchIcon = iconFor("search");

  return (
    <div className="flex h-full min-w-0 flex-col bg-background">
      {/* ---- Scrollable content ---- */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {hasMessages ? (
          /* ---- Active conversation ---- */
          <div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:px-6">
            {messages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}

            {/* Streaming output */}
            {isBusy && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-synth-violet/10">
                  <ThinkingOrb state="weaving" size={20} theme="dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-foreground">SYNTH Forge</span>
                  {output && output.length > 0 ? (
                    <div className="mt-1.5 rounded-lg border border-border/60 bg-white/[0.02] p-3 font-mono text-[10px] leading-4 text-foreground/85">
                      <FormattedOutput text={output} />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="size-1.5 animate-pulse rounded-full bg-synth-violet/60" />
                      <span className="text-[10px] text-muted-foreground/50">Thinking...</span>
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

            {/* Completed output */}
            {!isBusy && messages.length > 0 && messages[messages.length - 1].role === "user" && output && output.length > 0 && (
              <div className="flex gap-3">
                <div className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-synth-violet/10">
                  <ThinkingOrb state="connecting" size={20} theme="dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-foreground">SYNTH Forge</span>
                  <div className="mt-1.5 rounded-lg border border-border/60 bg-white/[0.02] p-3 font-mono text-[10px] leading-4 text-foreground/85">
                    <FormattedOutput text={output} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ---- No-file welcome state ---- */
          <div className="flex h-full flex-col items-center justify-center px-4">
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
            <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
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
          </div>
        )}
      </div>

      {/* ---- Composer ---- */}
      <div className="shrink-0 border-t border-border/40 bg-background/95 backdrop-blur-xl">
        {/* Suggestion chips — only when no messages */}
        {!hasMessages && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 pt-2.5 pb-0.5">
            {SUGGESTIONS.map((s) => {
              const SIcon = iconFor(s.icon);
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1",
                    "text-[10px] text-muted-foreground/60 transition-all",
                    "hover:border-synth-cyan/30 hover:bg-synth-cyan/[0.05] hover:text-foreground",
                  )}
                  onClick={() => handleSuggestion(s)}
                >
                  <SIcon className="size-2.5" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Input box */}
        <div className="mx-auto max-w-3xl px-4 pb-3 pt-2 sm:px-6">
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
                disabled={!input.trim() || isBusy}
                className={cn(
                  "size-7 rounded-lg transition-all",
                  input.trim() && !isBusy
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
      <div
        className={cn(
          "mt-1 flex size-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-white/[0.06]" : "bg-synth-violet/10",
        )}
      >
        {isUser ? (
          <span className="text-[10px] font-bold text-foreground/70">U</span>
        ) : (
          <span className="text-[10px] font-bold text-synth-violet">S</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">
            {isUser ? "You" : "SYNTH Forge"}
          </span>
          {message.actionLabel && (
            <span
              className={cn(
                "rounded border px-1 py-0 text-[7px]",
                isUser
                  ? "border-synth-cyan/20 text-synth-cyan"
                  : "border-synth-violet/20 text-synth-violet",
              )}
            >
              {message.actionLabel}
            </span>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/85">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formatted output                                                   */
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
                <div className="mb-1 border-b border-border/40 pb-1 text-[7px] uppercase tracking-wider text-muted-foreground/50">
                  {lang}
                </div>
              )}
              <pre className="overflow-x-auto text-[9px] leading-4">{code}</pre>
            </div>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap text-[11px] leading-relaxed">
            {part}
          </span>
        );
      })}
    </>
  );
}
