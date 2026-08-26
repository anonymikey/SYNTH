"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import { Lightbulb, GitCompare, Bug, Shuffle, ChevronDown, Wrench } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ForgeMessage {
  role: "user" | "assistant";
  content: string;
  requestId: string;
  label?: string;
}

interface ForgeAction {
  label: string;
  prompt: string;
  icon: string;
}

const QUICK_ACTIONS: ForgeAction[] = [
  { label: "Explain", prompt: "Explain the selected file's purpose, architecture, and key functions.", icon: "lightbulb" },
  { label: "Review", prompt: "Review the selected file for bugs, code smells, and maintainability.", icon: "gitCompare" },
  { label: "Find Issues", prompt: "Find potential bugs, runtime errors, and edge cases in the selected file.", icon: "bug" },
  { label: "Refactor", prompt: "Suggest refactoring improvements for the selected file.", icon: "shuffle" },
];

interface ForgeProps {
  filePath: string | null;
  fileContent: { language?: string; content: string } | null;
  messages: ForgeMessage[];
  isBusy: boolean;
  currentOutput: string;
  currentLabel: string | null;
  error: string | null;
  model: string;
  onAction: (prompt: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Forge — premium AI coding panel                                    */
/* ------------------------------------------------------------------ */
export function Forge({
  filePath,
  fileContent,
  messages,
  isBusy,
  currentOutput,
  currentLabel,
  error,
  model,
  onAction,
}: ForgeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localInput, setLocalInput] = useState("");

  const fileName = filePath?.split("/").pop() ?? null;
  const hasMessages = messages.length > 0;

  // Auto-scroll
  const prevLen = useRef(0);
  const prevOutput = useRef("");
  useEffect(() => {
    if (messages.length > prevLen.current || currentOutput !== prevOutput.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }));
    }
    prevLen.current = messages.length;
    prevOutput.current = currentOutput;
  }, [messages.length, currentOutput]);

  const handleSubmit = useCallback(() => {
    const text = localInput.trim();
    if (!text || isBusy) return;
    onAction(text);
    setLocalInput("");
    if (inputRef.current) inputRef.current.style.height = "40px";
  }, [localInput, isBusy, onAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  return (
    <div className="flex h-full flex-col bg-[#0c0e16]">
      {/* ---- Header ---- */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[.06] px-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" className="text-[#2dd4bf]" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            <path d="M20 12A8 8 0 0 0 12 4v8h8z" opacity=".4" />
          </svg>
          <span className="text-[11px] font-semibold text-white/90">SYNTH Forge</span>
        </div>
        <div className="flex-1" />
        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#2dd4bf]/10 text-[#2dd4bf]/70 font-mono">
          {getSynthModelLabel(model || "synth-code")}
        </span>
      </div>

      {/* ---- Status bar (when busy) ---- */}
      {isBusy && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[.04] bg-[#2dd4bf]/[0.03]">
          <ThinkingOrb state={currentOutput ? "weaving" : "working"} size={20} theme="dark" />
          <span className="text-[11px] text-white/60">
            {currentLabel || "Analyzing..."}
          </span>
          <span className="ml-auto text-[9px] text-white/25 animate-pulse">streaming</span>
        </div>
      )}

      {/* ---- Content ---- */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4">
          {/* File context card */}
          {fileName && (
            <div className="mb-4 rounded-lg border border-white/[.06] bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#2dd4bf]/10 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-[#2dd4bf]">{(fileName.split('.').pop() || 'F').toUpperCase().slice(0, 3)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-white/80 truncate">{fileName}</p>
                  <p className="text-[9px] text-white/30">{fileContent?.language || 'unknown'} · {fileContent?.content.split('\n').length || 0} lines</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasMessages && !isBusy && !currentOutput && !error && (
            <div className="py-6 text-center">
              <div className="mx-auto w-9 h-9 mb-3 rounded-full bg-[#2dd4bf]/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" className="text-[#2dd4bf]/60" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                  <path d="M20 12A8 8 0 0 0 12 4v8h8z" opacity=".4" />
                </svg>
              </div>
              <p className="text-[13px] text-white/60 mb-1">
                {fileName ? `Analyse "${fileName}"` : "What shall we build?"}
              </p>
              <p className="text-[10px] text-white/30 mb-4">
                Ask Forge or use a quick action below.
              </p>
              <div className="grid grid-cols-2 gap-1.5 max-w-[240px] mx-auto">
                {QUICK_ACTIONS.map(a => {
                  const AIcon = iconFor(a.icon);
                  return (
                    <button
                      key={a.label}
                      type="button"
                      disabled={!fileName}
                      onClick={() => onAction(a.prompt)}
                      className="flex items-center gap-1.5 rounded-md border border-white/[.05] bg-white/[.02] px-2.5 py-2 text-left text-[10px] text-white/60 hover:border-[#2dd4bf]/20 hover:bg-[#2dd4bf]/[0.04] hover:text-white/80 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    >
                      <AIcon className="size-3 shrink-0" />
                      <span>{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {hasMessages && (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={`${msg.requestId}-${i}`}>
                  {msg.role === 'user' && (
                    <div className="rounded-lg border border-white/[.06] bg-white/[.03] p-3">
                      <span className="text-[9px] font-semibold text-white/40 block mb-1 uppercase tracking-wider">You</span>
                      <p className="text-[12px] leading-relaxed text-white/75 whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  )}
                  {msg.role === 'assistant' && (
                    <div className="rounded-lg border border-[#8b5cf6]/10 bg-[#8b5cf6]/[0.03] p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" className="text-[#8b5cf6]" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                          <path d="M20 12A8 8 0 0 0 12 4v8h8z" opacity=".4" />
                        </svg>
                        <span className="text-[9px] font-semibold text-[#8b5cf6]/70">SYNTH Forge</span>
                      </div>
                      <FormattedOutput text={msg.content} />
                    </div>
                  )}
                </div>
              ))}

              {/* Live streaming output */}
              {(isBusy || (currentOutput && currentOutput.length > 0) || error) && (
                <div className="rounded-lg border border-[#8b5cf6]/10 bg-[#8b5cf6]/[0.03] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    {isBusy && <ThinkingOrb state={currentOutput ? "weaving" : "working"} size={20} theme="dark" />}
                    <span className="text-[9px] font-semibold text-[#8b5cf6]/70">
                      {isBusy ? "Forge — analyzing" : "Forge"}
                    </span>
                  </div>
                  {error && !currentOutput && (
                    <p className="text-[11px] text-red-400 py-2">{error}</p>
                  )}
                  {currentOutput && currentOutput.length > 0 && (
                    <FormattedOutput text={currentOutput} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ---- Composer ---- */}
      <div className="shrink-0 border-t border-white/[.06] bg-[#0a0c14]">
        <div className="m-2 rounded-xl border border-white/[.06] bg-white/[0.03] overflow-hidden">
          {/* Gradient top edge */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#2dd4bf]/20 to-transparent" />

          <textarea
            ref={inputRef}
            value={localInput}
            onChange={e => {
              setLocalInput(e.target.value);
              e.target.style.height = "40px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={fileName ? `Ask Forge to change your project...` : 'Ask Forge anything...'}
            disabled={isBusy}
            rows={1}
            className="w-full resize-none border-none bg-transparent px-3.5 py-2.5 text-[12px] text-white/80 placeholder:text-white/20 focus:outline-none disabled:opacity-40"
            style={{ minHeight: 40 }}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="rounded-md p-1 text-white/25 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              {/* Builder button */}
              <button
                type="button"
                className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[9px] text-white/35 hover:text-white/55 hover:bg-white/[0.05] transition-colors"
              >
                <Wrench className="size-2.5" />
                <span>Builder</span>
              </button>
            </div>
            <button
              type="button"
              disabled={!localInput.trim() || isBusy}
              onClick={handleSubmit}
              className="rounded-lg p-1.5 transition-all disabled:opacity-15"
              style={{
                background: localInput.trim() ? '#2dd4bf' : 'rgba(255,255,255,0.05)',
                color: localInput.trim() ? '#080a12' : undefined,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  lightbulb: Lightbulb,
  gitCompare: GitCompare,
  bug: Bug,
  shuffle: Shuffle,
};

function iconFor(name: string) {
  return ICON_MAP[name] || (() => null);
}

/* ------------------------------------------------------------------ */
/*  Formatted Output — renders markdown with collapsible REASONING     */
/* ------------------------------------------------------------------ */

function FormattedOutput({ text }: { text: string }) {
  const sections = text.split(/\n{2,}/);

  return (
    <div className="space-y-2">
      {sections.map((section, i) => {
        const trimmed = section.trim();
        if (!trimmed) return null;

        // Code block
        if (trimmed.startsWith('```')) {
          const langMatch = trimmed.match(/^```(\w*)/);
          const lang = langMatch?.[1] || 'code';
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '');
          return (
            <div key={i} className="rounded-md border border-white/[.04] bg-[#0a0c14] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[.04]">
                <span className="text-[8px] font-mono text-white/30">{lang}</span>
                <button
                  type="button"
                  className="text-[8px] text-white/30 hover:text-[#2dd4bf] transition-colors"
                  onClick={() => navigator.clipboard.writeText(code)}
                >
                  copy
                </button>
              </div>
              <pre className="p-3 text-[11px] font-mono text-white/65 overflow-x-auto whitespace-pre leading-relaxed">{code}</pre>
            </div>
          );
        }

        // REASONING section — collapsible
        const reasoningMatch = trimmed.match(/^(REASONING|REASONING\s*:?)(?:\s*)/i);
        if (reasoningMatch) {
          const body = trimmed.slice(reasoningMatch[0].length).trim();
          return (
            <CollapsibleSection key={i} title="Reasoning">
              <p className="text-[11px] leading-relaxed text-white/55 whitespace-pre-wrap">{body}</p>
            </CollapsibleSection>
          );
        }

        // Other section headers
        const headerMatch = trimmed.match(/^(PLAN|AFFECTED FILES|PROPOSED CHANGES|SUMMARY|CHANGES|FILES MODIFIED|IMPLEMENTATION):?\s*/i);
        if (headerMatch) {
          const header = headerMatch[1].toUpperCase();
          const body = trimmed.slice(headerMatch[0].length);
          return (
            <div key={i} className="rounded-md border border-white/[.04] bg-white/[0.015] p-2.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#2dd4bf]/70 mb-1.5">{header}</p>
              <div className="text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap">{body}</div>
            </div>
          );
        }

        // Numbered list items
        if (/^\d+\.\s/.test(trimmed)) {
          return (
            <div key={i} className="text-[11px] leading-relaxed text-white/60 whitespace-pre-wrap pl-1">
              {trimmed}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="text-[12px] leading-relaxed text-white/65 whitespace-pre-wrap">{trimmed}</p>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CollapsibleSection — for Reasoning etc.                            */
/* ------------------------------------------------------------------ */

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-md border border-white/[.04] bg-white/[0.015] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <ChevronDown
          className={`size-3 text-white/30 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">{title}</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-0">
          {children}
        </div>
      )}
    </div>
  );
}
