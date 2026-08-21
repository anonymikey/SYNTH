"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconFor } from "@/lib/icons";
import { getAgentDisplayName } from "@/lib/ai/synth-agents";
import { getSynthModelLabel } from "@/lib/ai/synth-models";
import type { ModuleActionId, ModuleActionState } from "@/components/modules/types";
import type { ProjectFileContent, ProjectInfo } from "@/lib/project/use-project";

interface ForgeAction {
  id: ModuleActionId;
  label: string;
  description: string;
  icon: string;
  searchAssisted?: boolean;
}

const FORGE_ACTIONS: ForgeAction[] = [
  { id: "run-code-action", label: "Explain file", description: "Understand what this file does and how it works.", icon: "lightbulb" },
  { id: "run-code-action", label: "Review code", description: "Identify potential issues, bugs, and improvements.", icon: "gitCompare" },
  { id: "run-code-action", label: "Find potential bugs", description: "Analyze for common bug patterns.", icon: "circleHelp", searchAssisted: true },
  { id: "run-code-action", label: "Summarize file", description: "Get a concise summary of the file's purpose.", icon: "bookOpen" },
  { id: "run-code-action", label: "Suggest refactor", description: "Get refactoring recommendations.", icon: "sparkles", searchAssisted: true },
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
  const forgeLabel = getAgentDisplayName("coder");
  const isBusy = actionState === "loading";

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{forgeLabel}</CardTitle>
          <Badge variant="outline" className="border-synth-violet/25 text-[9px] text-synth-violet">read-only</Badge>
        </div>
        <p className="text-[10px] leading-4 text-muted-foreground">
          AI actions for the selected file. Routes through SynthEngine.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {/* Action buttons */}
        {FORGE_ACTIONS.map((action) => {
          const Icon = iconFor(action.icon);
          const isCurrentAction = isBusy && lastActionLabel === action.label;
          return (
            <Button
              key={action.label}
              type="button"
              variant={isCurrentAction ? "default" : "outline"}
              disabled={isBusy || !filePath}
              className={`h-auto min-h-10 w-full justify-start gap-2.5 px-3 py-2 text-left ${
                isCurrentAction ? "border-synth-violet bg-synth-violet/10 text-foreground" : ""
              }`}
              onClick={() => onAction(action.id, action.label)}
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
                isCurrentAction ? "bg-synth-violet/20 text-synth-violet" : "bg-synth-violet/10 text-synth-violet"
              }`}>
                {isCurrentAction
                  ? <div className="size-3 animate-spin rounded-full border-2 border-synth-violet/30 border-t-synth-violet" />
                  : <Icon className="size-3" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium">{action.label}</span>
                <span className="mt-0.5 block text-[9px] leading-3 text-muted-foreground">{action.description}</span>
              </span>
              {action.searchAssisted && (
                <Badge variant="outline" className="ml-auto shrink-0 text-[7px] text-muted-foreground/60">search</Badge>
              )}
            </Button>
          );
        })}

        {/* Context indicator — what Forge is analyzing */}
        {filePath && (
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Analyzing</p>
            {project?.github && (
              <p className="mt-0.5 font-mono text-[9px] text-blue-400/80">
                {project.github.owner}/{project.github.repo} · {project.github.ref}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-[10px] text-foreground">
              {fileContent?.path ?? filePath}
            </p>
            {fileContent && (
              <div className="mt-1 flex items-center gap-2 text-[8px] text-muted-foreground/70">
                <span>{fileContent.language}</span>
                <span>·</span>
                <span>{fileContent.lineCount} lines</span>
                <span>·</span>
                <span>{(fileContent.byteSize / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>
        )}

        {!filePath && (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center">
            <p className="text-[10px] text-muted-foreground">Select a file to analyze</p>
          </div>
        )}

        {/* Read-only notice */}
        {readOnly && (
          <div className="rounded-lg border border-synth-success/15 bg-synth-success/5 px-3 py-2 text-[9px] text-muted-foreground">
            <span className="font-medium text-synth-success">Read-only</span> — analyze without modifying
          </div>
        )}

        {/* Action result */}
        {(actionState !== "idle" || output || error) && (
          <ForgeResult
            state={actionState}
            output={output}
            error={error}
            model={model}
            actionLabel={lastActionLabel}
          />
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Result display                                                     */
/* ------------------------------------------------------------------ */

function ForgeResult({
  state,
  output,
  error,
  model,
  actionLabel,
}: {
  state: ModuleActionState;
  output?: string;
  error?: string;
  model?: string;
  actionLabel: string | null;
}) {
  const isFailure = state === "error" || state === "unavailable";
  const isLoading = state === "loading";

  return (
    <div className={`rounded-lg border p-3 ${
      isFailure
        ? "border-destructive/30 bg-destructive/5"
        : isLoading
          ? "border-synth-violet/25 bg-synth-violet/5"
          : "border-synth-success/25 bg-synth-success/5"
    }`}>
      {/* Status header */}
      <div className="flex items-center gap-2">
        {isLoading ? (
          <div className="size-3.5 animate-spin rounded-full border-2 border-synth-violet/30 border-t-synth-violet" />
        ) : isFailure ? (
          <span className="size-3.5 rounded-full bg-destructive/20" />
        ) : (
          <span className="size-3.5 rounded-full bg-synth-success/20" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold">
            {isLoading ? "Analyzing..." : isFailure ? "Analysis failed" : "Analysis complete"}
          </p>
          {actionLabel && (
            <p className="font-mono text-[9px] text-muted-foreground">{actionLabel}</p>
          )}
        </div>
        {model && (
          <Badge variant="outline" className="shrink-0 font-mono text-[8px] uppercase tracking-[0.08em]">
            {getSynthModelLabel(model)}
          </Badge>
        )}
      </div>

      {/* Output */}
      {(output || error) && (
        <ScrollArea className="mt-2 max-h-[24rem]">
          <div className="whitespace-pre-wrap font-mono text-[10px] leading-5 text-foreground/85">
            {isFailure ? (
              <span className="text-destructive">{error}</span>
            ) : (
              <RichOutput text={output ?? ""} />
            )}
          </div>
        </ScrollArea>
      )}

      {/* Loading hint */}
      {isLoading && (
        <p className="mt-2 font-mono text-[8px] uppercase tracking-[0.12em] text-synth-violet/70">
          Streaming through SynthEngine...
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Simple markdown-ish rendering for code blocks                      */
/* ------------------------------------------------------------------ */

function RichOutput({ text }: { text: string }) {
  // Split on code fences and render code blocks distinctly
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3);
          const firstNewline = lines.indexOf("\n");
          const lang = firstNewline > 0 ? lines.slice(0, firstNewline).trim() : "";
          const code = firstNewline > 0 ? lines.slice(firstNewline + 1) : lines;
          return (
            <div key={i} className="my-2 rounded-md border border-border bg-background/50 p-2">
              {lang && (
                <div className="mb-1 border-b border-border/50 pb-1 font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
                  {lang}
                </div>
              )}
              <pre className="overflow-x-auto text-[10px] leading-5">{code}</pre>
            </div>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
