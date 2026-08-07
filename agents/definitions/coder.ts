import type { AgentDefinition } from "@/agents/types";

export const coderAgent: AgentDefinition = { id: "coder", label: "Coder", mode: "coder", intents: ["coding"], skillIds: ["coding"], toolIds: ["filesystem", "terminal", "git"], responsePolicy: "structured", enabled: false };
