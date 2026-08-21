import type { AgentDefinition } from "@/agents/types";

export const plannerAgent: AgentDefinition = { id: "planner", displayName: "SYNTH Architect", label: "Planner", mode: "planner", intents: ["planning"], skillIds: ["planning"], toolIds: [], responsePolicy: "structured", enabled: true };
