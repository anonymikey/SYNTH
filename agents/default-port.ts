import type { AgentPort } from "@/engine/ports";
import { AgentRegistry } from "@/agents/registry";
import type { AgentMode } from "@/types/workspace";

const modeToAgentId: Record<AgentMode, string> = {
  assistant: "assistant",
  architect: "software-architect",
  researcher: "codebase-onboarding",
  reviewer: "code-reviewer",
};

export const synthAgentPort: AgentPort = {
  async resolve(intent, mode, agentId) {
    const selected = AgentRegistry.resolve(agentId ?? modeToAgentId[mode]);
    return selected?.enabled && selected.intents.includes(intent) ? selected : undefined;
  },
};
