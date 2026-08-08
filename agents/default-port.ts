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

const definitions: AgentDefinition[] = [assistantAgent, coderAgent, designerAgent, plannerAgent, researcherAgent, reviewerAgent, testerAgent];
const modeToAgentId: Record<AgentMode, string> = {
  assistant: "assistant",
  architect: "planner",
  researcher: "researcher",
  reviewer: "reviewer",
};

export const synthAgentPort: AgentPort = {
  async resolve(intent, mode) {
    const agentId = modeToAgentId[mode];
    return definitions.find((definition) => definition.enabled && definition.id === agentId && definition.intents.includes(intent));
  },
};
