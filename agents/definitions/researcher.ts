import type { AgentDefinition } from "@/agents/types";

export const researcherAgent: AgentDefinition = { id: "researcher", displayName: "SYNTH Scout", label: "Researcher", mode: "researcher", intents: ["research"], skillIds: ["research"], toolIds: ["search", "browser", "documentation"], responsePolicy: "structured", enabled: false };
