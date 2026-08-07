import type { ToolDefinition } from "@/tools/types";

export const deploymentTool: ToolDefinition = { id: "deployment", label: "Deployment", category: "deployment", requiresApproval: true, enabled: false, inputSchema: {} };
