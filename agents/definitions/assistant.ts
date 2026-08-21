import type { AgentDefinition } from "@/agents/types";

export const assistantAgent: AgentDefinition = { id: "assistant", displayName: "SYNTH Core", label: "Assistant", mode: "assistant", intents: ["conversation"], skillIds: [], toolIds: [], responsePolicy: "direct", enabled: false };
