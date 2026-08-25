"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";
import { getAgentDisplayName } from "@/lib/ai/synth-agents";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import type { ModuleActionId, ModuleActionState } from "@/components/modules/types";
import type { ProjectFileContent, ProjectInfo } from "@/lib/project/use-project";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ForgeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLabel?: string;
  timestamp: number;
}

interface ForgeAction {
  id: ModuleActionId;
  label: string;
  icon: string;
  prompt?: string;
}

const QUICK_ACTIONS: ForgeAction[] = [
  { id: "run-code-action", label: "Explain", icon: "lightbulb", prompt: "Explain this file's purpose and architecture. Identify key functions, exports, and how it fits into the project." },
  { id: "run-code-action", label: "Review", icon: "gitCompare", prompt: "Review this file for bugs, code smells, and maintainability issues. Be specific about line-level problems." },
  { id: "run-code-action", label: "Find Bugs", icon: "bug", prompt: "Find all potential bugs, runtime errors, edge cases, and logic issues in this file." },
  { id: "run-code-action", label: "Refactor", icon: "sparkles", prompt: "Suggest refactoring improvements for this file. Focus on readability, performance, and maintainability." },
];

interface CodeForgeProps {
  filePath: string | null;
  fileContent: ProjectFileContent | null;
  lastActionLabel: string | null;
  actionState: ModuleActionState;
  output?: string;
  error?: string;
  model?: string;
  onAction: (id: ModuleActionId, label: string) => void;
  readOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CodeForge({
  filePath,
  fileContent,
  lastActionLabel,
  actionState,
  output,
  error,
  model,
  onAction,
  readOnly: _readOnly = true,
}: CodeForgeProps) {
  const [messages, setMessages] = useState<ForgeMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["reasoning"]));
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevActionLabelRef = useRef<string | null>(null);

  const forgeLabel = getAgentDisplayName("coder");
  const isBusy = actionState === "loading";
  const fileName = filePath?.split("/").pop() ?? null;

  // Detect when CodeModule fires a new action from the welcome state
  // The lastActionLabel contains the user's prompt text
  useEffect(() => {
    if (lastActionLabel && lastActionLabel !== prevActionLabelRef.current && isBusy) {
      // Check if this message is already in the list (avoid duplicates)
      const alreadyExists = messages.some(
        (m) => m.role === "user" && m.content === lastActionLabel,
      );
      if (!alreadyExists) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "user",
            content: lastActionLabel,
            actionLabel: lastActionLabel.length > 60 ? lastActionLabel.slice(0, 60) + "..." : undefined,
            timestamp: Date.now(),
          },
        ]);
      }
      prevActionLabelRef.current = lastActionLabel;
    }
  }, [lastActionLabel, isBusy, messages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, output, isBusy]);

  const handleQuickAction = useCallback(
    (action: ForgeAction) => {
      if (isBusy) return;

      const prompt = action.prompt
        ? fileName
          ? `${action.prompt}\n\nFile: ${filePath}`
          : action.prompt
        : `${action.label} the selected file.`;

      const msg: ForgeMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        actionLabel: action.label,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      onAction(action.id, prompt);
    },
    [isBusy, filePath, fileName, onAction],
  );

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isBusy) return;

    const msg: ForgeMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    onAction("run-code-action", inputValue.trim());
    setInputValue("");
    if (inputRef.current) inputRef.current.style.height = "36px";
  }, [inputValue, isBusy, onAction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const toggleSection = useCallback((id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="flex h-full min-w-[280px] flex-col border-l border-border/60 bg-background/80">
      {/* ---- Header ---- */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-foreground">AI Assistance</span>
        </div>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[9px]">
              <span className="text-[9px]">Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Open chat</TooltipContent>
        </Tooltip>
      </div>

      {/* ---- Content area ---- */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="p-3">
          {/* File context card */}
          {fileName && (
            <div className="mb-3 rounded-lg border border-border/40 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-synth-cyan/10">
                  <span className="text-[9px] font-bold text-synth-cyan">
                    {fileName.split(".").pop()?.toUpperCase().slice(0, 3) ?? "FILE"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-foreground">{fileName}</p>
                  <p className="text-[9px] text-muted-foreground/50">
                    {fileContent?.language ?? "unknown"} · {fileContent?.content.split("\n").length ?? 0} lines
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Welcome state — no messages yet */}
          {messages.length === 0 && !output && !error && (
            <div className="space-y-3">
              <div className="py-2 text-center">
                <ThinkingOrb
                  state={fileName ? "connecting" : "breathing"}
                  size={20}
                  theme="dark"
                />
                <p className="mt-2 text-[11px] font-medium text-foreground">
                  {fileName ? `Ready to analyze ${fileName}` : "Select a file to begin"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground/50">
                  Ask me to explain, review, find bugs, or refactor your code.
                </p>
              </div>

              {/* Quick actions as cards */}
              <div className="space-y-1.5">
                {QUICK_ACTIONS.map((action) => {
                  const ActionIcon = iconFor(action.icon);
                  return (
                    <button
                      key={action.label}
                      type="button"
                      disabled={!fileName}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-border/30 bg-white/[0.01] px-3 py-2.5 text-left transition-colors hover:border-synth-violet/30 hover:bg-synth-violet/[0.04] disabled:opacity-40"
                      onClick={() => handleQuickAction(action)}
                    >
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-synth-violet/10">
                        <ActionIcon className="size-3.5 text-synth-violet" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-medium text-foreground">{action.label}</span>
                        <p className="mt-0.5 text-[9px] text-muted-foreground/50 line-clamp-1">
                          {action.label === "Explain" && "Understand the architecture and purpose"}
                          {action.label === "Review" && "Code quality and maintainability analysis"}
                          {action.label === "Find Bugs" && "Detect potential runtime errors"}
                          {action.label === "Refactor" && "Improve readability and performance"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-foreground">You</span>
                    {msg.actionLabel && (
                      <Badge variant="outline" className="h-3.5 border-synth-cyan/20 px-1 text-[7px] text-synth-cyan">
                        {msg.actionLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] leading-4 text-foreground/80">{msg.content}</p>
                </div>
              ))}

              {/* Assistant response */}
              {(isBusy || output || error) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-semibold text-synth-violet">{forgeLabel}</span>
                    {lastActionLabel && (
                      <Badge variant="outline" className="h-3.5 border-synth-violet/20 px-1 text-[7px] text-synth-violet">
                        {lastActionLabel.length > 30 ? lastActionLabel.slice(0, 30) + "..." : lastActionLabel}
                      </Badge>
                    )}
                  </div>

                  {isBusy && !output && (
                    <div className="flex items-center gap-2.5 py-3">
                      <ThinkingOrb state="solving" size={20} theme="dark" />
                      <div>
                        <p className="text-[10px] font-medium text-foreground">Analyzing code...</p>
                        <p className="text-[9px] text-muted-foreground/50">
                          Reading {fileName ?? "file"} and generating response
                        </p>
                      </div>
                    </div>
                  )}

                  {error && !output && (
                    <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                      <p className="text-[10px] text-destructive">{error}</p>
                    </div>
                  )}

                  {output && output.length > 0 && (
                    <ForgeStructuredOutput
                      text={output}
                      expandedSections={expandedSections}
                      onToggleSection={toggleSection}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* ---- Composer ---- */}
      <div className="shrink-0 border-t border-border/40 p-2.5">
        <div className="rounded-lg border border-border/60 bg-white/[0.02]">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              e.target.style.height = "36px";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={fileName ? `Ask about ${fileName}...` : "Select a file first..."}
            disabled={isBusy}
            rows={1}
            className="w-full resize-none border-none bg-transparent px-3 py-2.5 text-[11px] leading-4 text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50"
            style={{ minHeight: "36px", maxHeight: "120px" }}
          />
          <div className="flex items-center justify-between px-2.5 pb-2">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground/30 hover:text-foreground">
                <span className="text-[10px]">+</span>
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-6 text-muted-foreground/30 hover:text-foreground">
                {(() => { const I = iconFor("paperclip"); return <I className="size-3" />; })()}
              </Button>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="h-4 border-synth-violet/15 px-1.5 text-[7px] text-synth-violet/70">
                {getSynthModelLabel(model ?? "synth-code")}
              </Badge>
              <Button
                type="button"
                size="icon"
                disabled={!inputValue.trim() || isBusy}
                className="size-6 rounded-md bg-synth-violet/15 text-synth-violet hover:bg-synth-violet/25 disabled:bg-white/[0.03] disabled:text-muted-foreground/20"
                onClick={handleSend}
              >
                <span className="text-[10px]">↑</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Structured Forge Output                                            */
/* ------------------------------------------------------------------ */

function ForgeStructuredOutput({
  text,
  expandedSections,
  onToggleSection,
}: {
  text: string;
  expandedSections: Set<string>;
  onToggleSection: (id: string) => void;
}) {
  // Parse response into sections: reasoning, code blocks, file references
  const sections = parseForgeOutput(text);

  return (
    <div className="space-y-2.5">
      {/* Reasoning section */}
      {sections.reasoning.length > 0 && (
        <div className="rounded-lg border border-border/40 bg-white/[0.01]">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
            onClick={() => onToggleSection("reasoning")}
          >
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Reasoning
            </span>
            <span className="text-[9px] text-muted-foreground/40">
              {expandedSections.has("reasoning") ? "▾" : "▸"}
            </span>
          </button>
          {expandedSections.has("reasoning") && (
            <div className="border-t border-border/30 px-3 py-2.5">
              <div className="space-y-1.5 font-mono text-[10px] leading-4 text-foreground/75">
                {sections.reasoning.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-muted-foreground/30">•</span>
                    <span className="whitespace-pre-wrap">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Code blocks */}
      {sections.codeBlocks.map((block, i) => (
        <div key={i} className="rounded-lg border border-border/40 bg-background/60">
          {block.language && (
            <div className="flex items-center justify-between border-b border-border/30 px-3 py-1.5">
              <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50">
                {block.language}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-4 px-1.5 text-[8px]">
                Copy
              </Button>
            </div>
          )}
          <pre className="overflow-x-auto p-3 font-mono text-[10px] leading-4 text-foreground/80">
            {block.code}
          </pre>
        </div>
      ))}

      {/* Proposed changes summary */}
      {sections.fileChanges.length > 0 && (
        <div className="rounded-lg border border-synth-cyan/20 bg-synth-cyan/[0.03]">
          <div className="px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-synth-cyan/70">
              Proposed Changes
            </span>
          </div>
          <div className="space-y-1 border-t border-synth-cyan/10 px-3 py-2">
            {sections.fileChanges.map((change, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="font-mono text-foreground/70">{change.file}</span>
                {change.additions > 0 && (
                  <span className="text-synth-success">+{change.additions}</span>
                )}
                {change.deletions > 0 && (
                  <span className="text-destructive">-{change.deletions}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plain text paragraphs (everything else) */}
      {sections.plainText.length > 0 && (
        <div className="space-y-2 rounded-lg border border-border/40 bg-white/[0.01] px-3 py-2.5">
          {sections.plainText.map((para, i) => (
            <p key={i} className="whitespace-pre-wrap text-[11px] leading-4 text-foreground/80">
              {para}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Output parser                                                      */
/* ------------------------------------------------------------------ */

interface ParsedOutput {
  reasoning: string[];
  codeBlocks: { language: string; code: string }[];
  fileChanges: { file: string; additions: number; deletions: number }[];
  plainText: string[];
}

function parseForgeOutput(text: string): ParsedOutput {
  const result: ParsedOutput = {
    reasoning: [],
    codeBlocks: [],
    fileChanges: [],
    plainText: [],
  };

  const parts = text.split(/(```[\s\S]*?```)/g);

  for (const part of parts) {
    if (part.startsWith("```") && part.endsWith("```")) {
      const inner = part.slice(3, -3);
      const nl = inner.indexOf("\n");
      const lang = nl > 0 ? inner.slice(0, nl).trim() : "";
      const code = nl > 0 ? inner.slice(nl + 1) : inner;
      result.codeBlocks.push({ language: lang, code: code.trim() });
    } else {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Detect reasoning sections
      if (trimmed.toLowerCase().startsWith("reasoning") || trimmed.toLowerCase().startsWith("analysis")) {
        const lines = trimmed.split("\n").filter((l) => l.trim());
        const startIdx = lines.findIndex((l) => /reasoning|analysis/i.test(l));
        if (startIdx >= 0) {
          result.reasoning.push(...lines.slice(startIdx + 1).map((l) => l.replace(/^[•\-\*]\s*/, "")));
          continue;
        }
      }

      // Detect file change patterns
      const changeMatch = trimmed.match(/^([a-zA-Z\/\.\-]+\.\w{1,4})\s*[+]?(\d+)?\s*[-]?(\d+)?$/m);
      if (changeMatch) {
        result.fileChanges.push({
          file: changeMatch[1],
          additions: parseInt(changeMatch[2] ?? "0", 10),
          deletions: parseInt(changeMatch[3] ?? "0", 10),
        });
        continue;
      }

      result.plainText.push(trimmed);
    }
  }

  return result;
}
