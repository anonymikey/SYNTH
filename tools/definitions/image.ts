import type { ToolDefinition } from "@/tools/types";

export const imageTool: ToolDefinition = { id: "image", label: "Image", category: "image", requiresApproval: true, enabled: false, inputSchema: {} };
