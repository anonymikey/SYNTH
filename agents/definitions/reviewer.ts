import type { AgentDefinition } from "@/agents/types";

export const reviewerAgent: AgentDefinition = { id: "reviewer-general", displayName: "SYNTH Sentinel", label: "General Reviewer", mode: "reviewer", intents: ["review"], skillIds: ["debugging"], toolIds: ["git", "filesystem"], responsePolicy: "review", enabled: false };
