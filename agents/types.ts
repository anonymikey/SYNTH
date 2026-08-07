import type { EngineIntent } from "@/engine/types";

export type AgentRole = "assistant" | "coder" | "researcher" | "reviewer" | "planner" | "designer" | "tester";

export interface AgentDefinition {
  id: string;
  label: string;
  mode: AgentRole;
  intents: EngineIntent[];
  skillIds: string[];
  toolIds: string[];
  responsePolicy: "direct" | "structured" | "review";
  enabled: boolean;
}

export interface AgentPlan {
  agentId: string;
  intent: EngineIntent;
  skillIds: string[];
  toolIds: string[];
}
