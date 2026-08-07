import type { SkillDefinition } from "@/skills/types";

export const debuggingSkill: SkillDefinition = { id: "debugging", label: "Debugging", description: "Reusable debugging behavior", instructions: [], contextRequirements: ["project"], enabled: false };
