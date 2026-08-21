import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import { getAgentDisplayName } from "@/lib/ai/synth-agents";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import type { ModuleActionId, ModuleActionState } from "@/components/modules/types";

interface ForgeAction {
  id: ModuleActionId;
  label: string;
  description: string;
  icon: string;
}

const FORGE_ACTIONS: ForgeAction[] = [
  { id: "run-code-action", label: "Explain file", description: "Understand what this file does and how it works.", icon: "lightbulb" },
  { id: "run-code-action", label: "Review code", description: "Identify potential issues, bugs, and improvements.", icon: "gitCompare" },
  { id: "run-code-action", label: "Find potential bugs", description: "Analyze the code for common bug patterns.", icon: "circleHelp" },
  { id: "run-code-action", label: "Summarize file", description: "Get a concise summary of the file's purpose.", icon: "bookOpen" },
  { id: "run-code-action", label: "Suggest refactor", description: "Get refactoring recommendations.", icon: "sparkles" },
];

interface CodeForgeProps {
  filePath: string | null;
  fileName?: string;
  actionState: ModuleActionState;
  output?: string;
  error?: string;
  model?: string;
  onAction: (id: ModuleActionId, label: string) => void;
  readOnly?: boolean;
}

export function CodeForge({
  filePath,
  fileName,
  actionState,
  output,
  error,
  model,
  onAction,
  readOnly = true,
}: CodeForgeProps) {
  const forgeLabel = getAgentDisplayName("coder");

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 border-b border-border/70 pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">{forgeLabel}</CardTitle>
          <Badge variant="outline" className="border-synth-violet/25 text-[9px] text-synth-violet">read-only</Badge>
        </div>
        <p className="text-[10px] leading-4 text-muted-foreground">
          AI actions for the selected file. All actions route through the Engine boundary.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {FORGE_ACTIONS.map((action) => {
          const Icon = iconFor(action.icon);
          return (
            <Button
              key={action.label}
              type="button"
              variant="outline"
              disabled={actionState === "loading" || !filePath}
              className="h-auto min-h-10 w-full justify-start gap-2.5 px-3 py-2 text-left"
              onClick={() => onAction(action.id, action.label)}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-synth-violet/10 text-synth-violet">
                <Icon className="size-3" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-medium">{action.label}</span>
                <span className="mt-0.5 block text-[9px] leading-3 text-muted-foreground">{action.description}</span>
              </span>
            </Button>
          );
        })}

        {/* Selected file indicator */}
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">Selected file</p>
          <p className="mt-0.5 truncate font-mono text-[10px] text-foreground">
            {fileName ?? "None"}
          </p>
        </div>

        {/* Read-only notice */}
        {readOnly && (
          <div className="rounded-lg border border-synth-success/15 bg-synth-success/5 px-3 py-2 text-[9px] text-muted-foreground">
            <span className="font-medium text-synth-success">Read-only mode</span> — actions analyze files without modifying them.
          </div>
        )}

        {/* Action feedback */}
        <ModuleActionFeedback state={actionState} output={output} error={error} model={model} />
      </CardContent>
    </Card>
  );
}
