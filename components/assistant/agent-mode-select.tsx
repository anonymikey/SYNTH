import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGENT_MODES } from "@/modules/assistant/constants";
import type { AgentMode } from "@/types/workspace";

export function AgentModeSelect({ value, onChange }: { value: AgentMode; onChange: (mode: AgentMode) => void }) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as AgentMode)}>
      <SelectTrigger size="sm" className="w-[128px] border-transparent bg-transparent font-mono text-[10px] uppercase tracking-[0.1em] text-synth-cyan hover:bg-synth-cyan/5"><SelectValue /></SelectTrigger>
      <SelectContent>
        {AGENT_MODES.map((mode) => <SelectItem key={mode.value} value={mode.value}>{mode.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
