import type { AgentModuleDefinition } from "@/modules/agent/types";

export const synthAgentModule: AgentModuleDefinition = {
  id: "agent",
  label: "SYNTH Agent",
  status: "planned",
  intents: ["planning"],
  capabilities: {
    planning: true,
    autonomousExecution: false,
    toolExecution: false,
  },
};
