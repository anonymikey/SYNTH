import type { ToolDefinition } from "@/tools/types";

export const browserTool: ToolDefinition = { id: "browser", label: "Browser", category: "browser", requiresApproval: true, enabled: false, inputSchema: {} };
