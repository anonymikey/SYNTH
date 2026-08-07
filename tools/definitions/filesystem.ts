import type { ToolDefinition } from "@/tools/types";

export const filesystemTool: ToolDefinition = { id: "filesystem", label: "Filesystem", category: "filesystem", requiresApproval: true, enabled: false, inputSchema: {} };
