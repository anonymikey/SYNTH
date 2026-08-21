import type { AgentDefinition } from "@/agents/types";

export const testerAgent: AgentDefinition = { id: "tester", displayName: "SYNTH Verify", label: "Tester", mode: "tester", intents: ["review"], skillIds: ["coding", "debugging"], toolIds: ["terminal"], responsePolicy: "review", enabled: false };
