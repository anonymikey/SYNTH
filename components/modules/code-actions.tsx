"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import type { ModuleActionId, ModuleActionState } from "@/components/modules/types";

const actions: Array<{ id: ModuleActionId; label: string; description: string; icon: string }> = [
  { id: "run-code-action", label: "Explain file", description: "Queue an engine-scoped explanation for the selected file.", icon: "lightbulb" },
  { id: "run-code-action", label: "Review changes", description: "Prepare a review request without calling a provider from the UI.", icon: "gitCompare" },
  { id: "run-code-action", label: "Generate implementation", description: "Stage a coding request for the future Code agent.", icon: "sparkles" },
];

export function CodeActions({ filePath, actionState, output, error, model, onAction }: { filePath?: string; actionState: ModuleActionState; output?: string; error?: string; model?: string; onAction: (id: ModuleActionId, label: string) => void }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="gap-2 border-b border-border/70 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">AI actions</CardTitle>
          <Badge variant="outline" className="border-synth-violet/25 text-[9px] text-synth-violet">Engine seam</Badge>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Actions stay provider-neutral and will route through SYNTH Engine with the selected file as context.</p>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {actions.map((action) => {
          const Icon = iconFor(action.icon);
          return <Button key={action.label} type="button" variant="outline" disabled={actionState === "loading" || !filePath} className="h-auto min-h-11 w-full justify-start gap-3 px-3 py-2.5 text-left" onClick={() => onAction(action.id, action.label)}><span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-synth-cyan/10 text-synth-cyan"><Icon className="size-3.5" aria-hidden="true" /></span><span className="min-w-0"><span className="block text-xs font-medium">{action.label}</span><span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">{action.description}</span></span></Button>;
        })}
        <div className="rounded-lg border border-border bg-muted/20 p-3 text-[10px] leading-4 text-muted-foreground">
          <span className="font-semibold text-foreground">Selected file:</span> {filePath ?? "None"}
        </div>
        <ModuleActionFeedback state={actionState} output={output} error={error} model={model} />
      </CardContent>
    </Card>
  );
}
