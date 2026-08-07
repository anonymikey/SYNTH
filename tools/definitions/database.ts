import type { ToolDefinition } from "@/tools/types";

export const databaseTool: ToolDefinition = { id: "database", label: "Database", category: "database", requiresApproval: true, enabled: false, inputSchema: {} };
