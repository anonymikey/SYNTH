import { Button } from "@/components/ui/button";
import type { SuggestedPrompt } from "@/modules/assistant/types";

export function SuggestionGrid({
  suggestions,
  onSelect,
}: {
  suggestions: SuggestedPrompt[];
  onSelect: (prompt: SuggestedPrompt) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Try asking label */}
      <p className="text-[11px] font-medium text-muted-foreground/70">
        Try asking:
      </p>

      {/* Inline suggestion pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion.id}
            variant="outline"
            size="sm"
            className="h-auto rounded-full border-border/60 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-synth-cyan/40 hover:bg-synth-cyan/5 hover:text-foreground"
            onClick={() => onSelect(suggestion)}
          >
            {suggestion.label}
          </Button>
        ))}
      </div>

      {/* Helper text */}
      <p className="mt-1 text-[10px] text-muted-foreground/50">
        Click + to attach &bull; Use mic for voice &bull; Hover messages to edit/copy
      </p>
    </div>
  );
}
