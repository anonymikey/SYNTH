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
  { ...assistantAgent, enabled: true, intents: [...assistantAgent.intents, "planning"], toolIds: ["calculator"] },
  { ...coderAgent, enabled: true, intents: [...coderAgent.intents, "planning"], toolIds: ["calculator", "workspace_info"] },
  { ...designerAgent, enabled: true, intents: [...designerAgent.intents, "planning"], toolIds: ["calculator"] },
  { ...plannerAgent, enabled: true, intents: [...plannerAgent.intents, "planning"], toolIds: ["calculator"] },
  { ...researcherAgent, enabled: true, intents: [...researcherAgent.intents, "planning"], toolIds: ["search_demo", "calculator"] },
  { ...reviewerAgent, enabled: true, intents: [...reviewerAgent.intents, "planning"], toolIds: ["calculator"] },
  { ...testerAgent, enabled: true, intents: [...testerAgent.intents, "planning"], toolIds: ["calculator"] },
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
