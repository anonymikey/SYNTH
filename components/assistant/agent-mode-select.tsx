import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGENT_MODES } from "@/modules/assistant/constants";
import type { AgentMode } from "@/types/workspace";

export function AgentModeSelect({ value, onChange }: { value: AgentMode; onChange: (mode: AgentMode) => void }) {
  const currentMode = AGENT_MODES.find((m) => m.value === value);

  return (
    <Select value={value} onValueChange={(next) => onChange(next as AgentMode)}>
      <SelectTrigger
        size="sm"
        className="h-8 max-w-[105px] xs:max-w-[115px] sm:max-w-[130px] shrink-0 rounded-lg border-border/60 bg-card/70 px-2 sm:px-2.5 font-mono text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-synth-cyan hover:border-synth-cyan/40 hover:bg-synth-cyan/10 transition-colors"
        aria-label={`Mode: ${currentMode?.label ?? value}`}
      >
        <SelectValue>
          <span className="truncate">{currentMode?.label ?? value}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="w-56 rounded-xl border-border/80 bg-popover/98 p-1 shadow-2xl backdrop-blur-md">
        <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
          Agent persona
        </div>
        {AGENT_MODES.map((mode) => (
          <SelectItem key={mode.value} value={mode.value} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-medium text-foreground">{mode.label}</span>
              <span className="text-[10px] text-muted-foreground">{mode.description}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
