import type { AgentDefinition } from "@/agents/types";

export interface AgencyAgentSource {
  name: string;
  specialty: string;
  whenToUse?: string;
  mission?: string;
  workflow?: string[];
  deliverables?: string[];
}

/** Converts source material into a SYNTH-owned contract; runtime never reads external markdown. */
export function adaptAgencyDefinition(source: AgencyAgentSource, overrides: Partial<AgentDefinition> & Pick<AgentDefinition, "id" | "label">): AgentDefinition {
  return {
    id: overrides.id,
    label: overrides.label,
    displayName: overrides.displayName ?? overrides.label,
    mode: overrides.mode ?? "planner",
    division: overrides.division ?? "specialized",
    description: overrides.description ?? source.specialty,
    persona: overrides.persona ?? `A focused SYNTH specialist for ${source.name}.`,
    mission: overrides.mission ?? source.mission ?? source.specialty,
    workflow: overrides.workflow ?? source.workflow ?? [],
    deliverables: overrides.deliverables ?? source.deliverables ?? [],
    successCriteria: overrides.successCriteria ?? ["Use repository evidence", "State uncertainty clearly"],
    communicationStyle: overrides.communicationStyle ?? "Concise, structured, and evidence-led.",
    modelPolicy: overrides.modelPolicy ?? "synth-reason",
    permissions: overrides.permissions ?? { repositoryRead: true, fileRead: true, search: true, diffRead: true, repositoryWrite: false, shellExecution: false, networkAccess: false, mcpConfiguration: false },
    memoryPolicy: overrides.memoryPolicy ?? { readApproved: true, writeOutcomes: true, scopes: ["project", "conversation"] },
    handoffRules: overrides.handoffRules ?? { to: [], required: ["findings", "nextAction"], maxContextChars: 6000 },
    version: overrides.version ?? "1.0.0",
    source: "agency-adapted",
    sourceAttribution: "Adapted from Agency Agents source definitions; curated and normalized for SYNTH. Agency Agents is not a SYNTH product.",
    intents: overrides.intents ?? ["planning"],
    skillIds: overrides.skillIds ?? [],
    toolIds: overrides.toolIds ?? [],
    capabilities: overrides.capabilities ?? [],
    responsePolicy: overrides.responsePolicy ?? "structured",
    enabled: overrides.enabled ?? true,
  };
}
