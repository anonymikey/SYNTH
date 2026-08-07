import type { ToolPort } from "@/engine/ports";
import type { ToolCall, ToolContext, ToolResult } from "@/tools/types";

export function createToolOrchestrator(port: ToolPort) {
  return {
    async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
      const definition = (await port.listAvailable(context)).find((item) => item.id === call.toolId);
      if (!definition || !definition.enabled) return { callId: call.id, toolId: call.toolId, status: "unsupported", error: "This SYNTH tool is not enabled yet." };
      if (definition.requiresApproval && !context.approved) return { callId: call.id, toolId: call.toolId, status: "requires-approval" };
      return port.execute(call, context);
    },
  };
}
