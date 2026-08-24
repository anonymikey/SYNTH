"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";
import { getAgentDisplayName } from "@/lib/ai/synth-agents";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import type { ModuleActionId, ModuleActionState } from "@/components/modules/types";
import type { ProjectFileContent, ProjectInfo } from "@/lib/project/use-project";

interface ForgeMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionLabel?: string;
  model?: string;
  timestamp: number;
}

interface ForgeAction {
  id: ModuleActionId;
  label: string;
  icon: string;
  shortcut?: string;
  searchAssisted?: boolean;
}

const QUICK_ACTIONS: ForgeAction[] = [
  { id: "run-code-action", label: "Explain", icon: "lightbulb", shortcut: "E" },
  { id: "run-code-action", label: "Review", icon: "gitCompare", shortcut: "R" },
  { id: "run-code-action", label: "Find Bugs", icon: "bug", shortcut: "B", searchAssisted: true },
  { id: "run-code-action", label: "Refactor", icon: "sparkles", shortcut: "F", searchAssisted: true },
];

interface CodeForgeProps {
  filePath: string | null;
  fileContent: ProjectFileContent | null;
  project: ProjectInfo | null;
  lastActionLabel: string | null;
  actionState: ModuleActionState;
  output?: string;
  error?: string;
  model?: string;
  onAction: (id: ModuleActionId, label: string) => void;
  readOnly?: boolean;
}

export function CodeForge({
  filePath,
  fileContent,
  project,
  lastActionLabel,
  actionState,
  output,
  error,
  model,
  onAction,
  readOnly = true,
}: CodeForgeProps) {
  const [messages, setMessages] = useState<ForgeMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const forgeLabel = getAgentDisplayName("coder");
  const isBusy = actionState === "loading";

  const handleQuickAction = useCallback(
    (action: ForgeAction) => {
      if (isBusy || !filePath) return;

      const msg: ForgeMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: action.label,
        actionLabel: action.label,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, msg]);
      onAction(action.id, action.label);
    },
    [isBusy, filePath, onAction],
  );

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isBusy || !filePath) return;

    const msg: ForgeMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    onAction("run-code-action", inputValue.trim());
    setInputValue("");
  }, [inputValue, isBusy, filePath, onAction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const hasOutput = output && output.length > 0;
  const showResult = hasOutput || error;

  return (
    <div className="flex h-full min-w-0 flex-col border-t border-border/60 bg-background/50">
      {/* Forge header */}
      <div className="flex h-8 shrink-0 items-center gap-2 border-b border-border/40 px-3">
        <div className="flex size-4 items-center justify-center rounded bg-synth-violet/15 text-synth-violet">
          <span className="text-[8px] font-bold">F</span>
        </div>
        <span className="text-[10px] font-semibold text-foreground">{forgeLabel}</span>
        <Badge variant="outline" className="border-synth-violet/20 text-[7px] text-synth-violet">
          {readOnly ? "read-only" : "active"}
        </Badge>
        <div className="flex-1" />
        {model && (
          <Badge variant="outline" className="font-mono text-[7px] uppercase tracking-wider">
            {getSynthModelLabel(model)}
          </Badge>
        )}
      </div>

      {/* Messages / Output area */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="space-y-3 p-3">
          {/* Welcome / context */}
          {messages.length === 0 && !showResult && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex size-8 items-center justify-center rounded-lg bg-synth-violet/10 text-synth-violet">
                <span className="text-[10px] font-bold">⚡</span>
              </div>
              <div>
                <p className="text-[11px] font-medium text-foreground">SYNTH Forge</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {filePath
                    ? `Analyzing ${filePath.split("/").pop()}`
                    : "Select a file to begin"}
                </p>
              </div>
            </div>
          )}

          {/* User messages */}
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

          {/* Assistant output */}
          {showResult && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold text-synth-violet">{forgeLabel}</span>
                {lastActionLabel && (
                  <Badge variant="outline" className="h-3.5 border-synth-violet/20 px-1 text-[7px] text-synth-violet">
                    {lastActionLabel}
                  </Badge>
                )}
              </div>
              {isBusy && !hasOutput && (
                <div className="flex items-center gap-2 py-2">
                  <div className="size-3 animate-spin rounded-full border-2 border-synth-violet/30 border-t-synth-violet" />
                  <span className="text-[10px] text-muted-foreground">Analyzing...</span>
                </div>
              )}
              {error && !hasOutput && (
                <div className="rounded-md border border-destructive/20 bg-destructive/5 p-2.5">
                  <p className="text-[10px] text-destructive">{error}</p>
                </div>
              )}
              {hasOutput && (
                <ForgeOutput text={output!} />
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick actions */}
      <div className="flex shrink-0 items-center gap-1 border-t border-border/40 px-2 py-1.5">
        {QUICK_ACTIONS.map((action) => {
          const Icon = iconFor(action.icon);
          const isCurrentAction = isBusy && lastActionLabel === action.label;
          return (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant={isCurrentAction ? "default" : "ghost"}
                  size="sm"
                  disabled={isBusy || !filePath}
                  className={`h-6 gap-1 px-2 text-[9px] ${
                    isCurrentAction
                      ? "bg-synth-violet/10 text-synth-violet"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={() => handleQuickAction(action)}
                >
                  {isCurrentAction ? (
                    <div className="size-2.5 animate-spin rounded-full border border-synth-violet/30 border-t-synth-violet" />
                  ) : (
                    <Icon className="size-3" />
                  )}
                  {action.label}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {action.label}
                {action.shortcut && ` (Ctrl+${action.shortcut})`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/40 p-2">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-background/80 p-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={filePath ? `Ask Forge about ${filePath.split("/").pop()}...` : "Select a file first..."}
            disabled={!filePath || isBusy}
            rows={1}
            className="min-h-[28px] flex-1 resize-none bg-transparent text-[11px] leading-4 text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            style={{ maxHeight: "80px" }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                disabled={!inputValue.trim() || isBusy || !filePath}
                className="h-6 shrink-0 bg-synth-violet/15 text-synth-violet hover:bg-synth-violet/25"
                onClick={handleSend}
              >
                <span className="text-[9px]">Send</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Send to Forge</TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-1 text-center text-[8px] text-muted-foreground/40">
          SYNTH Forge · Read-only analysis · Routes through SynthEngine
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Forge output rendering                                             */
/* ------------------------------------------------------------------ */

function ForgeOutput({ text }: { text: string }) {
  // Split on code fences and render code blocks distinctly
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="rounded-md border border-synth-violet/15 bg-synth-violet/5 p-2.5">
      <div className="space-y-2 font-mono text-[10px] leading-5 text-foreground/85">
        {parts.map((part, i) => {
          if (part.startsWith("```") && part.endsWith("```")) {
            const lines = part.slice(3, -3);
            const firstNewline = lines.indexOf("\n");
            const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : "";
            const code = firstNewline > 0 ? lines.slice(firstNewline + 1) : lines;
            return (
              <div key={i} className="my-2 rounded border border-border bg-background/50 p-2">
                {lang && (
                  <div className="mb-1 border-b border-border/50 pb-1 text-[7px] uppercase tracking-wider text-muted-foreground/50">
                    {lang}
                  </div>
                )}
                <pre className="overflow-x-auto text-[9px] leading-4">{code}</pre>
              </div>
            );
          }
          return <span key={i} className="whitespace-pre-wrap">{part}</span>;
        })}
      </div>
    </div>
  );
}
