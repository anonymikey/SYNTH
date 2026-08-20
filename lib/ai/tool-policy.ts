import { MCPRegistry } from "./mcp-registry";
import { AgentRegistry } from "@/agents/registry";
import type { AgentDefinition } from "@/agents/types";

export interface ToolAuthorizationResult {
  ok: boolean;
  reason?: string;
  agent?: AgentDefinition;
}

export const ToolPolicy = {
  isRegistered(toolId: string) {
    return Boolean(MCPRegistry.findTool(toolId));
  },
  isEnabled(toolId: string) {
    const t = MCPRegistry.findTool(toolId);
    return Boolean(t && t.enabled);
  },
  // agentId must be provided; do not infer permissions from mode
  authorizeExecution(agentId: string | undefined, intent: import("@/engine/types").EngineIntent | undefined, toolId: string): ToolAuthorizationResult {
    if (!agentId) return { ok: false, reason: "tool requests must include an agentId" };
    const agent = AgentRegistry.resolve(agentId);
    if (!agent) return { ok: false, reason: `agent ${agentId} not found` };
    if (!agent.enabled) return { ok: false, reason: `agent ${agentId} is disabled` };
    if (intent && !agent.intents.includes(intent)) return { ok: false, reason: `agent ${agentId} does not support intent ${intent}` };
    if (!Array.isArray(agent.toolIds) || agent.toolIds.length === 0) return { ok: false, reason: `agent ${agentId} has no permitted tools configured` };
    if (!agent.toolIds.includes(toolId)) return { ok: false, reason: `tool ${toolId} is not permitted for agent ${agentId}` };
    const tool = MCPRegistry.findTool(toolId);
    if (!tool) return { ok: false, reason: `tool ${toolId} is not registered` };
    if (!tool.enabled) return { ok: false, reason: `tool ${toolId} is disabled` };
    // Phase 1 safety: only allow demo/local tools that appear in MCPRegistry
    return { ok: true, agent };
  },

};
