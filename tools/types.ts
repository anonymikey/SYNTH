export type ToolCategory = "filesystem" | "terminal" | "git" | "documentation" | "browser" | "search" | "database" | "image" | "deployment";

export interface ToolContext {
  requestId: string;
  projectId?: string;
  runtime: "web" | "desktop" | "mobile";
  approved: boolean;
}

export interface ToolCall {
  id: string;
  toolId: string;
  input: unknown;
}

export interface ToolResult {
  callId: string;
  toolId: string;
  status: "success" | "error" | "unsupported" | "requires-approval";
  output?: unknown;
  error?: string;
}

export interface ToolDefinition<TInput = unknown, TResult = unknown> {
  id: string;
  label: string;
  category: ToolCategory;
  requiresApproval: boolean;
  enabled: boolean;
  inputSchema: unknown;
  execute?: (input: TInput, context: ToolContext) => Promise<TResult>;
}
