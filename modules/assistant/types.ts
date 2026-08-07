import type { AgentMode } from "@/types/workspace";

export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  icon: string;
  tone: "cyan" | "blue" | "violet" | "green";
}

export interface AssistantWorkspaceState {
  agentMode: AgentMode;
  modelId: string;
  prompt: string;
}
