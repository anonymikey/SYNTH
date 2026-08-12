import type { AgentDefinition } from "@/agents/types";
import { assistantAgent } from "@/agents/definitions/assistant";
import { coderAgent } from "@/agents/definitions/coder";
import { designerAgent } from "@/agents/definitions/designer";
import { plannerAgent } from "@/agents/definitions/planner";
import { researcherAgent } from "@/agents/definitions/researcher";
import { reviewerAgent } from "@/agents/definitions/reviewer";
import { testerAgent } from "@/agents/definitions/tester";

const definitions: AgentDefinition[] = [];

const defaultDefinitions: AgentDefinition[] = [
  { ...assistantAgent, description: "Handles direct assistant conversations and keeps the workspace grounded in the current project context.", capabilities: ["conversation", "context recall", "clarification"] },
  { ...coderAgent, description: "Provides structured code guidance for implementation planning without executing shell commands or mutating files.", capabilities: ["implementation planning", "refactoring guidance", "review planning"] },
  { ...designerAgent, description: "Frames visual and UI-oriented suggestions while remaining provider-neutral and non-destructive.", capabilities: ["visual direction", "UX planning", "asset guidance"] },
  { ...plannerAgent, description: "Creates structured work plans and sequencing for the SYNTH workspace, while preserving the planning-only safety model.", capabilities: ["task decomposition", "sequencing", "risk highlighting"] },
  { ...researcherAgent, description: "Gathers local context, documentation, and workspace knowledge into a concise research synthesis.", capabilities: ["workspace research", "local synthesis", "context review"] },
  { ...reviewerAgent, description: "Checks plans and outputs for gaps, risk, and alignment with the active project context.", capabilities: ["review", "gap analysis", "safety checks"] },
  { ...testerAgent, description: "Summarizes testing and validation plans without executing arbitrary commands or shell actions.", capabilities: ["verification planning", "test strategy", "validation review"] },
];

export function ensureDefaultAgentsRegistered() {
  for (const definition of defaultDefinitions) {
    if (!definitions.some((item) => item.id === definition.id)) {
      definitions.push(definition);
    }
  }
}

export const AgentRegistry = {
  register(definition: AgentDefinition) {
    if (!definitions.some((item) => item.id === definition.id)) definitions.push(definition);
  },
  list: () => {
    ensureDefaultAgentsRegistered();
    return [...definitions];
  },
  resolve: (id: string) => {
    ensureDefaultAgentsRegistered();
    return definitions.find((item) => item.id === id);
  },
};
