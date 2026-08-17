import type { ToolPort } from "@/engine/ports";
import type { ToolCall, ToolContext, ToolResult } from "@/tools/types";
import { MCPRegistry } from "./mcp-registry";

function safeEvalExpression(expr: string): { ok: true; value: number } | { ok: false; error: string } {
  // Accept simple binary expressions like `45 * 27` or `3 + 4.5`
  const m = /^\s*([+-]?\d+(?:\.\d+)?)\s*([+\-*/])\s*([+-]?\d+(?:\.\d+)?)\s*$/.exec(expr);
  if (!m) return { ok: false, error: "Unsupported expression format" };
  const a = Number(m[1]);
  const op = m[2];
  const b = Number(m[3]);
  if (Number.isNaN(a) || Number.isNaN(b)) return { ok: false, error: "Invalid numbers" };
  switch (op) {
    case "+": return { ok: true, value: a + b };
    case "-": return { ok: true, value: a - b };
    case "*": return { ok: true, value: a * b };
    case "/": return { ok: true, value: b === 0 ? NaN : a / b };
    default: return { ok: false, error: "Unsupported operator" };
  }
}

export const mockMcpToolPort: ToolPort = {
  async listAvailable(_context: ToolContext) {
    // For demo, return tools from local server
    return MCPRegistry.listTools();
  },

  async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = MCPRegistry.findTool(call.toolId);
    if (!tool) return { callId: call.id, toolId: call.toolId, status: "unsupported", error: "Tool not found" };
    if (!tool.enabled) return { callId: call.id, toolId: call.toolId, status: "error", error: "Tool is disabled" };

    // Safe deterministic mock behavior
    try {
      switch (call.toolId) {
        case "calculator": {
          const input = (call.input as any) ?? {};
          const expr = typeof input.expression === "string" ? input.expression : String(input);
          const res = safeEvalExpression(expr);
          if (!res.ok) return { callId: call.id, toolId: call.toolId, status: "error", error: res.error };
          return { callId: call.id, toolId: call.toolId, status: "success", output: { result: res.value } };
        }
        case "workspace_info": {
          // Return benign demo workspace info based on context
          return { callId: call.id, toolId: call.toolId, status: "success", output: { projectId: context.projectId ?? "demo-project", files: ["src/index.ts", "README.md"], summary: "Demo workspace info" } };
        }
        case "search_demo": {
          const input = (call.input as any) ?? {};
          const q = String(input.query ?? "").trim();
          const results = q ? [{ id: "r1", title: `Demo result for \"${q}\"`, snippet: "This is a deterministic demo search result." }] : [];
          return { callId: call.id, toolId: call.toolId, status: "success", output: { results } };
        }
        default:
          return { callId: call.id, toolId: call.toolId, status: "unsupported", error: "Tool execution not implemented in mock MCP." };
      }
    } catch (err) {
      return { callId: call.id, toolId: call.toolId, status: "error", error: err instanceof Error ? err.message : String(err) };
    }
  },
};
