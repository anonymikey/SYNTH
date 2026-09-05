"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import {
  Lightbulb,
  GitCompare,
  Bug,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  FileCode,
} from "lucide-react";
import type {
  ForgeMessage,
  ForgeProposal,
  AffectedFile,
  ForgeTaskState,
} from "@/components/modules/forge-types";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
import { ResourceHubTrigger } from "@/components/workspace/resource-hub-trigger";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ForgeAction {
  label: string;
  prompt: string;
  icon: string;
}

const QUICK_ACTIONS: ForgeAction[] = [
  {
    label: "Explain",
    prompt:
      "Explain the selected file's purpose, architecture, and key functions.",
    icon: "lightbulb",
  },
  {
    label: "Review",
    prompt:
      "Review the selected file for bugs, code smells, and maintainability.",
    icon: "gitCompare",
  },
  {
    label: "Find Issues",
    prompt:
      "Find potential bugs, runtime errors, and edge cases in the selected file.",
    icon: "bug",
  },
  {
    label: "Refactor",
    prompt: "Suggest refactoring improvements for the selected file.",
    icon: "shuffle",
  },
];

const PROGRESS_LABELS = [
  "Analyzing project...",
  "Reviewing files...",
  "Examining dependencies...",
  "Preparing proposal...",
  "Composing response...",
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
  /** Current task state for status display */
  taskState?: ForgeTaskState;
  /** Current proposal awaiting approval */
  proposal?: ForgeProposal | null;
  /** Callback when user approves a proposal */
  onApprove?: (proposalId: string) => void;
  /** Callback when user rejects a proposal */
  onReject?: (proposalId: string) => void;
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
  taskState = "idle",
  proposal = null,
  onApprove,
  onReject,
}: ForgeProps) {
  const conversationRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [localInput, setLocalInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const fileName = filePath?.split("/").pop() ?? null;
  const hasMessages = messages.length > 0;

  /* ── Auto-scroll detection ────────────────────────────────────── */
  const checkScrollPosition = useCallback(() => {
    const el = conversationRef.current;
    if (!el) return;
    const threshold = 48;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distFromBottom < threshold;
    setAutoScroll(nearBottom);
    setShowScrollBtn(!nearBottom && (hasMessages || isBusy || currentOutput.length > 0));
  }, [hasMessages, isBusy, currentOutput]);

  /* ── Auto-scroll on new content ───────────────────────────────── */
  useEffect(() => {
    if (!autoScroll) return;
    const el = conversationRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [messages.length, currentOutput, autoScroll]);

  /* ── Scroll event listener ────────────────────────────────────── */
  useEffect(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScrollPosition, { passive: true });
    return () => el.removeEventListener("scroll", checkScrollPosition);
  }, [checkScrollPosition]);

  /* ── Scroll to latest ─────────────────────────────────────────── */
  const scrollToLatest = useCallback(() => {
    const el = conversationRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setAutoScroll(true);
    setShowScrollBtn(false);
  }, []);

  /* ── Submit ───────────────────────────────────────────────────── */
  const handleSubmit = useCallback(() => {
    const text = localInput.trim();
    if (!text || isBusy) return;
    onAction(text);
    setLocalInput("");
    if (inputRef.current) inputRef.current.style.height = "40px";
    // Scroll to latest after submit
    setAutoScroll(true);
    requestAnimationFrame(() => {
      const el = conversationRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [localInput, isBusy, onAction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  /* ── Status text ──────────────────────────────────────────────── */
  const statusText = (() => {
    switch (taskState) {
      case "working":
        return "Working";
      case "plan-ready":
        return "Plan ready";
      case "proposal-ready":
      case "awaiting-approval":
        return "Awaiting approval";
      case "approved":
        return "Approved";
      case "editing":
        return "Editing files";
      case "building":
        return "Building";
      case "preview-ready":
        return "Preview ready";
      case "error":
        return "Error";
      default:
        return isBusy
          ? currentLabel || PROGRESS_LABELS[0]
          : null;
    }
  })();

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b0d14]">
      {/* ── Header (fixed) ─────────────────────────────────────── */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[.07] bg-[#0f121b] px-3">
        <div className="flex items-center gap-2">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            className="text-[#9670ff]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
            <path d="M20 12A8 8 0 0 0 12 4v8h8z" opacity=".4" />
          </svg>
          <span className="text-[11px] font-semibold text-white/85">
            SYNTH Forge
          </span>
        </div>
        <div className="flex-1" />
        {/* Status indicator */}
        {statusText && (
          <div className="flex items-center gap-1.5">
            {isBusy && (
              <ThinkingOrb
                state={currentOutput ? "weaving" : "working"}
                size={20}
                theme="dark"
              />
            )}
            <span className="text-[9px] text-white/40">{statusText}</span>
          </div>
        )}
        <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-[#9670ff]/10 text-[#9670ff]/60 font-mono">
          {getSynthModelLabel(model || "synth-code")}
        </span>
      </div>

      {/* ── Conversation (scrollable) ───────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          ref={conversationRef}
          className="absolute inset-0 overflow-y-auto overflow-x-hidden"
        >
          <div className="p-3">
            {/* File context card */}
            <div className="mb-3 grid grid-cols-2 gap-1.5 rounded-xl border border-white/[.08] bg-[#11141d] p-2.5">
              {[['PROJECT', 'SYNTH'], ['REPOSITORY', 'anonymikey/SYNTH'], ['BRANCH', 'main'], ['FILES', '4'], ['DESIGN', 'Not attached'], ['MCP', 'Local Demo']].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-white/[.025] px-2 py-1.5">
                  <p className="text-[7px] font-semibold uppercase tracking-wider text-white/25">{label}</p>
                  <p className="mt-0.5 truncate text-[9px] text-white/65">{value}</p>
                </div>
              ))}
            </div>
            {fileName && (
              <div className="mb-3 rounded-xl border border-white/[.08] bg-[#11141d] p-2.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#9670ff]/10 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-[#9670ff]">
                      {(fileName.split(".").pop() || "F")
                        .toUpperCase()
                        .slice(0, 3)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-white/75 truncate">
                      {fileName}
                    </p>
                    <p className="text-[8px] text-white/25">
                      {fileContent?.language || "unknown"} ·{" "}
                      {fileContent?.content.split("\n").length || 0} lines
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!hasMessages && !isBusy && !currentOutput && !error && (
              <div className="py-4 text-center">
                <div className="mx-auto w-8 h-8 mb-2 rounded-full bg-[#9670ff]/10 flex items-center justify-center">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    className="text-[#9670ff]/50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                    <path
                      d="M20 12A8 8 0 0 0 12 4v8h8z"
                      opacity=".4"
                    />
                  </svg>
                </div>
                <p className="text-[12px] text-white/55 mb-0.5">
                  {fileName
                    ? `Analyse "${fileName}"`
                    : "What shall we build?"}
                </p>
                <p className="text-[9px] text-white/25 mb-3">
                  Ask Forge or use a quick action below.
                </p>
                <div className="grid grid-cols-2 gap-1.5 max-w-[220px] mx-auto">
                  {QUICK_ACTIONS.map((a) => {
                    const AIcon = iconFor(a.icon);
                    return (
                      <button
                        key={a.label}
                        type="button"
                        disabled={!fileName}
                        onClick={() => onAction(a.prompt)}
                        className="flex items-center gap-2 rounded-lg border border-white/[.08] bg-[#11141d] px-2.5 py-2 text-left text-[9px] text-white/55 transition-colors hover:border-[#9670ff]/30 hover:bg-[#9670ff]/[0.07] hover:text-white/85 disabled:cursor-not-allowed disabled:opacity-25"
                      >
                        <AIcon className="size-2.5 shrink-0" />
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
                    {msg.role === "user" && (
                      <div className="rounded-lg border border-white/[.06] bg-white/[.03] p-3">
                        <span className="text-[9px] font-semibold text-white/40 block mb-1 uppercase tracking-wider">
                          You
                        </span>
                        <p className="text-[12px] leading-relaxed text-white/75 whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                    )}
                    {msg.role === "assistant" && (
                      <div className="rounded-lg border border-[#9670ff]/10 bg-[#9670ff]/[0.03] p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            className="text-[#9670ff]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
                            <path
                              d="M20 12A8 8 0 0 0 12 4v8h8z"
                              opacity=".4"
                            />
                          </svg>
                          <span className="text-[9px] font-semibold text-[#9670ff]/70">
                            SYNTH Forge
                          </span>
                        </div>
                        <FormattedOutput text={msg.content} />

                        {/* Attached proposal */}
                        {msg.proposal && (
                          <ProposalCard
                            proposal={msg.proposal}
                            onApprove={onApprove}
                            onReject={onReject}
                          />
                        )}

                        {/* Build result */}
                        {msg.buildResult && (
                          <BuildResultCard result={msg.buildResult} />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Active proposal (awaiting approval) */}
                {proposal &&
                  proposal.status === "proposed" &&
                  taskState === "awaiting-approval" && (
                    <ProposalCard
                      proposal={proposal}
                      onApprove={onApprove}
                      onReject={onReject}
                    />
                  )}

                {/* Live streaming output */}
                {(isBusy ||
                  (currentOutput && currentOutput.length > 0) ||
                  error) && (
                  <div className="rounded-lg border border-[#9670ff]/10 bg-[#9670ff]/[0.03] p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      {isBusy && (
                        <ThinkingOrb
                          state={currentOutput ? "weaving" : "working"}
                          size={20}
                          theme="dark"
                        />
                      )}
                      <span className="text-[9px] font-semibold text-[#9670ff]/70">
                        {isBusy ? "Forge \u2014 analyzing" : "Forge"}
                      </span>
                    </div>
                    {error && !currentOutput && (
                      <p className="text-[11px] text-red-400/80 py-2">
                        {error}
                      </p>
                    )}
                    {currentOutput && currentOutput.length > 0 && (
                      <FormattedOutput text={currentOutput} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Scroll-to-latest button ───────────────────────────── */}
        {showScrollBtn && (
          <button
            type="button"
            aria-label="Scroll to latest"
            onClick={scrollToLatest}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-full border border-[#2dd4bf]/20 bg-[#0c0e16]/90 backdrop-blur-sm px-2.5 py-1 text-[9px] text-[#2dd4bf] hover:bg-[#2dd4bf]/10 transition-all animate-fade-in shadow-lg"
          >
            <ChevronDown className="size-3 animate-bounce" />
            <span>New output</span>
          </button>
        )}
      </div>

      {/* ── Composer (fixed bottom) ─────────────────────────────── */}
      <div className="shrink-0 border-t border-white/[.07] bg-[#0b0d14] px-1 pb-1">
        <div className="m-2 overflow-hidden rounded-xl border border-white/[.1] bg-[#11141d] shadow-lg shadow-black/20">
          {/* Gradient top edge */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#9670ff]/20 to-transparent" />

          <textarea
            ref={inputRef}
            value={localInput}
            onChange={(e) => {
              setLocalInput(e.target.value);
              e.target.style.height = "40px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              fileName
                ? `Ask Forge to change your project...`
                : "Ask Forge anything..."
            }
            disabled={isBusy}
            rows={1}
            className="w-full resize-none border-none bg-transparent px-3 py-2 text-[11px] text-white/80 placeholder:text-white/20 focus:outline-none disabled:opacity-40"
            style={{ minHeight: 40 }}
          />
          <div className="flex items-center justify-between px-2.5 pb-1.5">
            <div className="flex items-center gap-1">
              <ResourceHubTrigger
                variant="icon"
                label="Add context"
                onFilesSelected={(files) => setLocalInput((current) => `${current}${current ? "\n\n" : ""}Attached files: ${files.map((file) => file.name).join(", ")}`)}
                onCodePasted={(code) => setLocalInput((current) => `${current}${current ? "\n\n" : ""}${code}`)}
              />
              {QUICK_ACTIONS.slice(0, 2).map((action) => {
                const ActionIcon = ICON_MAP[action.icon];
                return (
                  <button key={action.label} type="button" onClick={() => onAction(action.prompt)} className="flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[8px] text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/60">
                    <ActionIcon className="size-2.5" />
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!localInput.trim() || isBusy}
              onClick={handleSubmit}
              className="rounded-lg p-1 transition-all disabled:opacity-15"
              style={{
                background: localInput.trim() ? "#2dd4bf" : "rgba(255,255,255,0.05)",
                color: localInput.trim() ? "#080a12" : undefined,
              }}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
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

/* ------------------------------------------------------------------ */
/*  Icon map                                                           */
/* ------------------------------------------------------------------ */

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
/*  Proposal Card — shows affected files, diff, approve/reject         */
/* ------------------------------------------------------------------ */

function ProposalCard({
  proposal,
  onApprove,
  onReject,
}: {
  proposal: ForgeProposal;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = proposal.status === "proposed";

  return (
    <div className="mt-2 rounded-lg border border-[#9670ff]/15 bg-[#9670ff]/[0.04] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-[#9670ff]/10">
        <FileCode className="size-3 text-[#9670ff]/60" />
        <span className="text-[9px] font-semibold text-[#9670ff]/70 uppercase tracking-wider">
          Proposed Changes
        </span>
        <div className="flex-1" />
        <span className="text-[8px] text-white/30">
          {proposal.affectedFiles.length}{" "}
          {proposal.affectedFiles.length === 1 ? "file" : "files"}
        </span>
        {proposal.diff && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[8px] text-[#9670ff]/50 hover:text-[#9670ff]/80 transition-colors"
          >
            {expanded ? "Hide" : "View Diff"}
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="px-2.5 py-1.5">
        <p className="text-[10px] text-white/60 leading-relaxed">
          {proposal.summary}
        </p>
      </div>

      {/* Affected files */}
      {proposal.affectedFiles.length > 0 && (
        <div className="px-2.5 pb-1.5">
          <p className="text-[8px] font-semibold text-white/30 uppercase tracking-wider mb-1">
            Affected Files
          </p>
          <div className="space-y-0.5">
            {proposal.affectedFiles.map((f: AffectedFile) => (
              <div
                key={f.path}
                className="flex items-center gap-1.5 text-[9px]"
              >
                <span
                  className={`font-mono ${
                    f.operation === "create"
                      ? "text-[#5de6a0]"
                      : f.operation === "delete"
                        ? "text-[#fb7185]"
                        : "text-white/50"
                  }`}
                >
                  {f.path}
                </span>
                <span className="text-[8px] text-white/20">
                  {f.reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff (collapsible) */}
      {expanded && proposal.diff && (
        <div className="border-t border-[#9670ff]/10 bg-[#080a0f]/50 max-h-[200px] overflow-y-auto">
          <pre className="p-2.5 text-[9px] font-mono text-white/50 whitespace-pre overflow-x-auto leading-relaxed">
            {proposal.diff}
          </pre>
        </div>
      )}

      {/* Approve / Reject */}
      {isPending && (
        <div className="flex items-center gap-2 px-2.5 py-2 border-t border-[#9670ff]/10">
          <button
            type="button"
            onClick={() => onReject?.(proposal.id)}
            className="flex items-center gap-1 rounded-md border border-white/[.06] bg-white/[0.03] px-2 py-1 text-[9px] text-white/50 hover:border-red-400/20 hover:text-red-400/70 transition-colors"
          >
            <X className="size-2.5" />
            Reject
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => onApprove?.(proposal.id)}
            className="flex items-center gap-1 rounded-md bg-[#2dd4bf]/10 border border-[#2dd4bf]/20 px-2.5 py-1 text-[9px] text-[#2dd4bf] hover:bg-[#2dd4bf]/20 transition-colors"
          >
            <Check className="size-2.5" />
            Approve Changes
          </button>
        </div>
      )}

      {/* Status badges */}
      {proposal.status === "applied" && (
        <div className="px-2.5 py-1.5 border-t border-[#9670ff]/10">
          <span className="text-[8px] text-[#5de6a0]">✓ Applied</span>
        </div>
      )}
      {proposal.status === "rejected" && (
        <div className="px-2.5 py-1.5 border-t border-[#9670ff]/10">
          <span className="text-[8px] text-white/30">Rejected</span>
        </div>
      )}
      {proposal.status === "failed" && (
        <div className="px-2.5 py-1.5 border-t border-[#9670ff]/10">
          <span className="text-[8px] text-[#fb7185]">
            Failed to apply
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Build Result Card                                                  */
/* ------------------------------------------------------------------ */

function BuildResultCard({ result }: { result: { status: string; duration?: number; errors?: string } }) {
  const isSuccess = result.status === "success";
  return (
    <div className="mt-2 rounded-md border border-white/[.05] bg-white/[0.02] p-2">
      <div className="flex items-center gap-1.5">
        <div
          className={`size-1.5 rounded-full ${
            isSuccess ? "bg-[#5de6a0]" : "bg-[#fb7185]"
          }`}
        />
        <span className="text-[9px] font-medium text-white/60">
          {isSuccess ? "Build complete" : "Build failed"}
        </span>
        {result.duration != null && (
          <span className="text-[8px] text-white/25 ml-auto">
            {(result.duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>
      {result.errors && (
        <p className="text-[9px] text-[#fb7185]/70 mt-1">
          {result.errors}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Formatted Output — renders markdown with collapsible sections       */
/* ------------------------------------------------------------------ */

function FormattedOutput({ text }: { text: string }) {
  // Check if text contains REASONING section — if so, extract and render collapsibly
  const reasoningMatch = text.match(/^(REASONING|REASONING\s*:?\s*)/im);

  if (reasoningMatch) {
    const idx = text.indexOf(reasoningMatch[0]);
    const before = text.slice(0, idx).trim();
    const reasoningBody = text
      .slice(idx + reasoningMatch[0].length)
      .trim();

    return (
      <div className="space-y-2">
        {before && <MarkdownRenderer content={before} variant="forge" className="text-[12px] leading-relaxed" />}
        <CollapsibleSection title="Reasoning">
          <MarkdownRenderer content={reasoningBody} variant="forge" className="text-[11px] leading-relaxed" />
        </CollapsibleSection>
      </div>
    );
  }

  return <MarkdownRenderer content={text} variant="forge" className="text-[12px] leading-relaxed" />;
}

/* ------------------------------------------------------------------ */
/*  CollapsibleSection                                                  */
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
    <div className="rounded-md border border-white/[.05] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronUp className="size-3 text-white/30" />
        ) : (
          <ChevronDown className="size-3 text-white/30" />
        )}
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
          {title}
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  );
}
