import type { AgentDefinition } from "@/agents/types";

const definitions: AgentDefinition[] = [];

export const AgentRegistry = {
  register(definition: AgentDefinition) {
    if (!definitions.some((item) => item.id === definition.id)) definitions.push(definition);
  },
  list: () => [...definitions],
  resolve: (id: string) => definitions.find((item) => item.id === id),
};
