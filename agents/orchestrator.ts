import { AgentRegistry } from "@/agents/registry";
import type { AgentDefinition } from "@/agents/types";
import type { MemoryPort } from "@/engine/ports";
import type { MemoryRecord } from "@/memory/types";

export interface AgentHandoff {
  from: string;
  to: string;
  objective: string;
  findings: string[];
  artifacts: string[];
  risks: string[];
  nextAction: string;
}

export interface AgentExecutionPlan {
  objective: string;
  agents: string[];
  steps: Array<{ agentId: string; objective: string; dependsOn: string[] }>;
  approvalRequired: boolean;
}

export interface StructuredAgentOutput {
  plan: string[];
  affectedFiles: string[];
  findings: string[];
  proposedChanges: string[];
  risks: string[];
  tests: string[];
  result: string;
  nextAction: string;
}

export function createExecutionPlan(objective: string, requestedAgentIds: string[] = []): AgentExecutionPlan {
  const available = requestedAgentIds.length ? requestedAgentIds : inferAgents(objective);
  const agents = available.filter((id) => AgentRegistry.resolve(id)?.enabled);
  const steps = agents.map((agentId, index) => ({ agentId, objective, dependsOn: index ? [agents[index - 1]] : [] }));
  return { objective, agents, steps, approvalRequired: true };
}

export async function retrieveApprovedContext(memory: MemoryPort | undefined, agent: AgentDefinition, query: string) {
  if (!memory || !agent.memoryPolicy?.readApproved) return [];
  return memory.retrieve({ query, scope: agent.memoryPolicy.scopes[0] ?? "project", limit: 6 });
}

export async function recordStructuredOutcome(memory: MemoryPort | undefined, agent: AgentDefinition, projectId: string, output: StructuredAgentOutput) {
  if (!memory?.record || !agent.memoryPolicy?.writeOutcomes) return;
  const record: MemoryRecord = { id: crypto.randomUUID(), scope: agent.memoryPolicy.scopes[0] ?? "project", content: JSON.stringify({ projectId, agentId: agent.id, result: output.result, findings: output.findings, nextAction: output.nextAction }), metadata: { type: "agent-outcome", agentId: agent.id, projectId }, createdAt: new Date().toISOString() };
  await memory.record(record);
}

export function createHandoff(from: AgentDefinition, to: AgentDefinition, output: StructuredAgentOutput): AgentHandoff {
  const max = to.handoffRules?.maxContextChars ?? 6000;
  const trim = (values: string[]) => values.join("\n").slice(0, max);
  return { from: from.id, to: to.id, objective: output.result.slice(0, 800), findings: [trim(output.findings)], artifacts: [trim(output.affectedFiles)], risks: [trim(output.risks)], nextAction: output.nextAction.slice(0, 800) };
}

function inferAgents(objective: string): string[] {
  const text = objective.toLowerCase();
  if (text.includes("security") || text.includes("auth") || text.includes("credential")) return ["codebase-onboarding", "security", "reviewer", "testing"];
  if (text.includes("ui") || text.includes("frontend") || text.includes("component")) return ["codebase-onboarding", "frontend", "reviewer", "testing"];
  if (text.includes("api") || text.includes("database") || text.includes("backend")) return ["codebase-onboarding", "backend", "reviewer", "testing"];
  return ["codebase-onboarding", "architect", "reviewer", "testing"];
}
