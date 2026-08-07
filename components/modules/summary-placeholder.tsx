import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { iconFor } from "@/lib/icons";

type SummaryState = "idle" | "loading" | "ready";

export function SummaryPlaceholder({ state, summary, onSummarize }: { state: SummaryState; summary?: string; onSummarize: () => void }) {
  const SummaryIcon = iconFor("sparkles");
  return (
    <Card className="border-synth-violet/20 bg-synth-violet/5">
      <CardHeader className="gap-2 border-b border-synth-violet/15 pb-4"><CardTitle className="flex items-center gap-2 text-sm"><SummaryIcon className="size-4 text-synth-violet" aria-hidden="true" /> Summary</CardTitle><p className="text-xs leading-5 text-muted-foreground">Summary generation is staged behind the research intent boundary.</p></CardHeader>
      <CardContent className="p-4">
        {state === "loading" && <div className="space-y-2" role="status" aria-live="polite"><Skeleton className="h-3 w-4/5" /><Skeleton className="h-3 w-3/5" /><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-synth-violet">Preparing local summary placeholder</p></div>}
        {state === "ready" && <p className="text-xs leading-5 text-foreground/80" role="status" aria-live="polite">{summary}</p>}
        {state === "idle" && <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">Create a local preview summary for the selected document.</p><Button variant="outline" onClick={onSummarize}>Summarize document</Button></div>}
      </CardContent>
    </Card>
  );
}
