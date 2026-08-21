import type { AgentDefinition } from "@/agents/types";

export const designerAgent: AgentDefinition = { id: "designer", displayName: "SYNTH Vision", label: "Designer", mode: "designer", intents: ["vision"], skillIds: ["writing"], toolIds: ["image"], responsePolicy: "structured", enabled: false };
