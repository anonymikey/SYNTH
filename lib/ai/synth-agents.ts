/**
 * SYNTH Agent Catalog — public-facing identity for agents.
 * Maps internal agent IDs to SYNTH-branded display names.
 */

export interface SynthAgentProfile {
  /** Internal agent ID (used by engine, never shown to users) */
  id: string;
  /** Public SYNTH-branded display name */
  displayName: string;
  /** Short description */
  description: string;
}

/** SYNTH agent identity catalog */
export const SYNTH_AGENT_CATALOG: SynthAgentProfile[] = [
  { id: "assistant", displayName: "SYNTH Core", description: "General reasoning and conversation" },
  { id: "coder", displayName: "SYNTH Forge", description: "Code generation and implementation" },
  { id: "designer", displayName: "SYNTH Vision", description: "Design and visual ideation" },
  { id: "planner", displayName: "SYNTH Architect", description: "System design and implementation plans" },
  { id: "researcher", displayName: "SYNTH Scout", description: "Research and context gathering" },
  { id: "reviewer-general", displayName: "SYNTH Sentinel", description: "General review of plans and workspace outputs" },
  { id: "reviewer", displayName: "SYNTH Reviewer", description: "Curated code review and risk analysis" },
  { id: "tester", displayName: "SYNTH Verify", description: "Testing and validation planning" },
];

/** Get the SYNTH display name for an agent ID */
export function getAgentDisplayName(agentId: string): string {
  const profile = SYNTH_AGENT_CATALOG.find((a) => a.id === agentId);
  return profile?.displayName ?? agentId;
}

/** Get the SYNTH agent profile by internal ID */
export function getAgentProfile(agentId: string): SynthAgentProfile | undefined {
  return SYNTH_AGENT_CATALOG.find((a) => a.id === agentId);
}
