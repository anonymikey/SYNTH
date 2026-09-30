import type { AgentPort } from "@/engine/ports";
import { AgentRegistry } from "@/agents/registry";
import type { AgentMode } from "@/types/workspace";

const modeToAgentId: Record<AgentMode, string> = {
  assistant: "assistant",
  architect: "architect",
  researcher: "codebase-onboarding",
  reviewer: "reviewer",
};

export const synthAgentPort: AgentPort = {
  async resolve(intent, mode, agentId) {
    const selected = AgentRegistry.resolve(agentId ?? modeToAgentId[mode]);
    if (!selected?.enabled) return undefined;
    // An explicit canonical agent ID is authoritative; the agent manifest governs its task policy.
    // Intent validation remains the fallback behavior for mode-only dispatch.
    return agentId ? selected : (selected.intents.includes(intent) ? selected : undefined);
  },
};
