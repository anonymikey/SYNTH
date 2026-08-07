import type { SkillDefinition } from "@/skills/types";

const definitions: SkillDefinition[] = [];

export const SkillRegistry = {
  register(definition: SkillDefinition) {
    if (!definitions.some((item) => item.id === definition.id)) definitions.push(definition);
  },
  list: () => [...definitions],
  resolve: (ids: string[]) => definitions.filter((item) => ids.includes(item.id)),
};
