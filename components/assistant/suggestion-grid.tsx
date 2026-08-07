import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { iconFor } from "@/lib/icons";
import type { SuggestedPrompt } from "@/modules/assistant/types";

const toneClasses = { cyan: "bg-synth-cyan/10 text-synth-cyan", blue: "bg-blue-500/10 text-blue-400", violet: "bg-synth-violet/10 text-synth-violet", green: "bg-synth-success/10 text-synth-success" } as const;

export function SuggestionGrid({ suggestions, onSelect }: { suggestions: SuggestedPrompt[]; onSelect: (prompt: SuggestedPrompt) => void }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Suggested SYNTH prompts">{suggestions.map((suggestion) => { const Icon = iconFor(suggestion.icon); return <Card key={suggestion.id} className="group border-border/80 bg-card/70 transition-all duration-200 hover:-translate-y-0.5 hover:border-synth-cyan/40 hover:bg-card"><CardContent className="p-1"><Button variant="ghost" className="h-auto w-full justify-start p-3 text-left hover:bg-transparent" onClick={() => onSelect(suggestion)}><span className={`mr-3 flex size-8 shrink-0 items-center justify-center rounded-lg ${toneClasses[suggestion.tone]}`}><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{suggestion.label}</span><span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">{suggestion.prompt}</span></span></Button></CardContent></Card>; })}</div>;
}
