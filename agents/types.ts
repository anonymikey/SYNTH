import type { EngineIntent } from "@/engine/types";

export type AgentRole = "assistant" | "coder" | "researcher" | "reviewer" | "planner" | "designer" | "tester";
export type AgentDivision = "orchestration" | "engineering" | "security" | "quality" | "specialized";
export type SynthModelId = "synth-ultra" | "synth-code" | "synth-reason" | "synth-vision";

export interface AgentPermissions {
  repositoryRead: boolean;
  fileRead: boolean;
  search: boolean;
  diffRead: boolean;
  repositoryWrite: boolean;
  shellExecution: boolean;
  networkAccess: boolean;
  mcpConfiguration: boolean;
}

export interface AgentMemoryPolicy {
  readApproved: boolean;
  writeOutcomes: boolean;
  scopes: Array<"conversation" | "project" | "workspace" | "long-term">;
}

export interface AgentHandoffRule {
  to: string[];
  required: string[];
  maxContextChars: number;
}

export interface AgentDefinition {
  id: string;
  label: string;
  /** Public SYNTH-branded display name (shown to users) */
  displayName?: string;
  mode: AgentRole;
  division?: AgentDivision;
  description?: string;
  persona?: string;
  mission?: string;
  workflow?: string[];
  deliverables?: string[];
  successCriteria?: string[];
  communicationStyle?: string;
  modelPolicy?: SynthModelId;
  permissions?: AgentPermissions;
  memoryPolicy?: AgentMemoryPolicy;
  handoffRules?: AgentHandoffRule;
  version?: string;
  source?: "synth-native" | "agency-adapted";
  sourceAttribution?: string;
  intents: EngineIntent[];
  skillIds: string[];
  toolIds: string[];
  capabilities?: string[];
  responsePolicy: "direct" | "structured" | "review";
  enabled: boolean;
}

export interface AgentPlan {
  agentId: string;
  intent: EngineIntent;
  skillIds: string[];
  toolIds: string[];
}
