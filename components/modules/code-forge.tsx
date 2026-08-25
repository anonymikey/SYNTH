"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSynthModelLabel } from "@/lib/ai/synth-models";

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
}

const QUICK_ACTIONS: ForgeAction[] = [
  { label: "Explain", prompt: "Explain the selected file's purpose, architecture, and key functions." },
  { label: "Review", prompt: "Review the selected file for bugs, code smells, and maintainability." },
  { label: "Find Issues", prompt: "Find potential bugs, runtime errors, and edge cases in the selected file." },
  { label: "Suggest Refactor", prompt: "Suggest refactoring improvements for the selected file." },
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
/*  Forge (stateless - receives messages/output/error as props)         */
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["section-general"]));

  const fileName = filePath?.split("/").pop() ?? null;
  const hasMessages = messages.length > 0;

  // Auto-scroll when content changes
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
    if (inputRef.current) inputRef.current.style.height = "36px";
  }, [localInput, isBusy, onAction]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  const toggle = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex h-full flex-col border-l border-border/60 bg-[#0a0c14]">
      {/* ---- Header ---- */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[.06] px-3 bg-[#0c0e18]">
        <svg width="16" height="16" viewBox="0 0 24 24" className="text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M20 12A8 8 0 0 0 12 4v8h8z" opacity=".4"/></svg>
        <span className="text-[11px] font-semibold tracking-wide text-white/90">SYNTH Forge</span>
        <div className="flex-1" />
        {currentLabel && (
          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-cyan-400/80">
            {currentLabel}
          </span>
        )}
        <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400/70 font-mono">
          {getSynthModelLabel(model || "synth-code")}
        </span>
      </div>

      {/* ---- Content ---- */}
      <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
        <div className="p-4">
          {/* File card */}
          {fileName && (
            <div className="mb-4 rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-cyan-400">{(fileName.split('.').pop() || 'F').toUpperCase().slice(0,3)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white/90 truncate">{fileName}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{fileContent?.language || 'unknown'} — {fileContent?.content.split('\n').length || 0} lines</p>
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasMessages && !isBusy && !currentOutput && !error && (
            <div className="py-8 text-center">
              <div className="mx-auto w-10 h-10 mb-4 rounded-full bg-cyan-900/30 flex items-center justify-center">
                <span className="text-[18px] text-cyan-400/70">&lt;/&gt;</span>
              </div>
              <p className="text-[13px] text-white/70 mb-1">
                {fileName ? `Analyse "${fileName}"` : 'What shall we build?'}
              </p>
              <p className="text-[11px] text-white/40">
                Ask, or use a quick action below.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2 max-w-sm mx-auto">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.label}
                    type="button"
                    disabled={!fileName}
                    onClick={() => onAction(a.prompt)}
                    className="rounded-lg border border-white/[.06] bg-white/[.03] px-3 py-2.5 text-left text-[11px] text-white/70 hover:border-[#2dd4bf40] hover:bg-[#2dd4bf08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="font-medium text-white/85">{a.label}</span>
                    <br /><span className="text-[9px] text-white/40">{a.label === 'Explain' ? 'Understand the code' : a.label === 'Review' ? 'Check for issues' : a.label === 'Find Issues' ? 'Spot bugs & edge-cases' : 'Improve quality'}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div key={`${msg.requestId}-${i}`} className={`rounded-lg border p-3 text-[13px] leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-white/[.03] border-white/[.06] text-white/80'
                    : 'bg-[#0e1225] border-[#1e243a] text-[#a0aec0]'
                }`}>
                  <span className={`text-[9px] font-semibold block mb-1 ${msg.role === 'user' ? 'text-white/50' : 'text-[#9f7aea]/60'}`}>
                    {msg.role === 'user' ? 'You' : 'SYNTH Forge'}
                    {msg.label ? <span className="ml-1.5 text-[8px] opacity-60">({msg.label})</span> : null}
                  </span>
                  {msg.content}
                </div>
              ))}

              {/* Live streaming output */}
              {(isBusy || (currentOutput && currentOutput.length > 0) || error) && (
                <div className="rounded-lg bg-[#0e1225] border border-[#1e243a] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {isBusy && <ThinkingOrb state={currentOutput ? "weaving" : "working"} size={20} theme="dark" />}
                    <span className="text-[9px] font-semibold text-[#9f7aea]">
                      {isBusy ? "Forge — analyzing" : "Forge"}
                    </span>
                    {isBusy && <span className="ml-auto text-[9px] text-white/30 animate-pulse">processing...</span>}
                  </div>
                  {isBusy && !currentOutput && (
                    <div className="flex items-center gap-2 py-2">
                      <ThinkingOrb state="working" size={20} theme="dark" />
                      <span className="text-[10px] text-white/40">Analyzing{fileName ? ` ${fileName}` : ''}...</span>
                    </div>
                  )}
                  {error && !currentOutput && (
                    <p className="text-[11px] text-red-400 py-2">{error}</p>
                  )}
                  {currentOutput && currentOutput.length > 0 && (
                    <FormattedOutput text={currentOutput} expanded={expandedSections} onToggle={toggle} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ---- Composer ---- */}
      <div className="shrink-0 border-t border-[#1e243a] bg-[#080b14]">
        <div className="m-2 rounded-lg border border-white/[.06] bg-[#141829]">
          <textarea
            ref={inputRef}
            value={localInput}
            onChange={e => {
              setLocalInput(e.target.value);
              e.target.style.height = "36px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={fileName ? `Ask about ${fileName}...` : 'What do you want to build?'}
            disabled={isBusy}
            rows={1}
            className="w-full resize-none border-none bg-transparent px-3 py-2.5 text-[13px] text-white/90 placeholder:text-white/25 focus:outline-none disabled:opacity-50"
            style={{ minHeight: 36 }}
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <div className="flex items-center gap-1.5 text-white/25 text-[10px]">
              <span className="cursor-pointer hover:text-white/50 transition-colors">⊕</span>
            </div>
            <button
              type="button"
              disabled={!localInput.trim() || isBusy}
              onClick={handleSubmit}
              className="rounded-lg p-1.5 transition-colors disabled:opacity-20"
              style={{ background: localInput.trim() ? '#2dd4bf' : 'rgba(255,255,255,0.05)', color: localInput.trim() ? '#000' : undefined }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Structured Output                                                  */
/* ------------------------------------------------------------------ */

function FormattedOutput({ text, expanded, onToggle }: {
  text: string
  expanded: Set<string>
  onToggle: (id: string) => void
}) {
  const sections = text.split(/\n{2,}/)
  return (
    <div className="space-y-2">
      {sections.map((s, i) => {
        if (s.startsWith('```')) {
          const code = s.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
          return (
            <div key={i} className="bg-[#0c0e14] border border-white/5 rounded-md overflow-hidden">
              <pre className="p-3 text-[12px] font-mono text-white/70 overflow-x-auto whitespace-pre">{code}</pre>
            </div>
          )
        }
        return <p key={i} className="text-[13px] leading-relaxed text-white/75 whitespace-pre-wrap">{s.trim()}</p>
      })}
    </div>
  )
}
