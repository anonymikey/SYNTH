import type { AgentPort } from "@/engine/ports";
import type { AgentDefinition } from "@/agents/types";
import type { AgentMode } from "@/types/workspace";
import { assistantAgent } from "@/agents/definitions/assistant";
import { coderAgent } from "@/agents/definitions/coder";
import { designerAgent } from "@/agents/definitions/designer";
import { plannerAgent } from "@/agents/definitions/planner";
import { researcherAgent } from "@/agents/definitions/researcher";
import { reviewerAgent } from "@/agents/definitions/reviewer";
import { testerAgent } from "@/agents/definitions/tester";

const definitions: AgentDefinition[] = [
  { ...assistantAgent, enabled: true, intents: [...assistantAgent.intents, "planning"] },
  { ...coderAgent, enabled: true, intents: [...coderAgent.intents, "planning"] },
  { ...designerAgent, enabled: true, intents: [...designerAgent.intents, "planning"] },
  { ...plannerAgent, enabled: true, intents: [...plannerAgent.intents, "planning"] },
  { ...researcherAgent, enabled: true, intents: [...researcherAgent.intents, "planning"] },
  { ...reviewerAgent, enabled: true, intents: [...reviewerAgent.intents, "planning"] },
  { ...testerAgent, enabled: true, intents: [...testerAgent.intents, "planning"] },
];
const modeToAgentId: Record<AgentMode, string> = {
  assistant: "assistant",
  architect: "planner",
  researcher: "researcher",
  reviewer: "reviewer",
};

export const synthAgentPort: AgentPort = {
  async resolve(intent, mode, agentId) {
    if (agentId) {
      return definitions.find((definition) => definition.enabled && definition.id === agentId && definition.intents.includes(intent));
    }

    const mappedAgentId = modeToAgentId[mode];
    return definitions.find((definition) => definition.enabled && definition.id === mappedAgentId && definition.intents.includes(intent));
  },
};
