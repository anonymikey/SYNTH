import type { ToolDefinition } from "@/tools/types";

export const gitTool: ToolDefinition = { id: "git", label: "Git", category: "git", requiresApproval: true, enabled: false, inputSchema: {} };
