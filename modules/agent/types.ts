import type { EngineIntent } from "@/engine/types";

export interface AgentModuleDefinition {
  id: "agent";
  label: "SYNTH Agent";
  status: "planned";
  intents: Extract<EngineIntent, "planning">[];
  capabilities: {
    planning: boolean;
    autonomousExecution: boolean;
    toolExecution: boolean;
  };
}

export interface AgentPlanRequest {
  agentId: string;
  objective: string;
  projectId: string;
  selectedFile?: string;
}
