import type { AgentDefinition } from "@/agents/types";

export const reviewerAgent: AgentDefinition = { id: "reviewer", label: "Reviewer", mode: "reviewer", intents: ["review"], skillIds: ["debugging"], toolIds: ["git", "filesystem"], responsePolicy: "review", enabled: false };
