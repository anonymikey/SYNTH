import type { AgentDefinition } from "@/agents/types";

export const assistantAgent: AgentDefinition = { id: "assistant", label: "Assistant", mode: "assistant", intents: ["conversation"], skillIds: [], toolIds: [], responsePolicy: "direct", enabled: false };
