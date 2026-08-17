import type { AIMessage, ProviderSelection, TokenUsage } from "@/lib/ai/types";
import type { AgentMode, RecentFile } from "@/types/workspace";
import type { ToolCall, ToolResult } from "@/tools/types";
import type { EngineError } from "@/engine/errors";

export type RuntimeTarget = "web" | "desktop" | "mobile";
export type EngineIntent = "conversation" | "coding" | "research" | "review" | "planning" | "vision" | "unknown";
export type MemoryScope = "conversation" | "workspace" | "project" | "long-term";

export interface EngineContext {
  projectId?: string;
  selectedFile?: string;
  recentFiles?: RecentFile[];
  knowledgeIds?: string[];
  memoryScopes?: MemoryScope[];
  explicitText?: string;
}

export interface EngineRequest {
  requestId: string;
  messages: AIMessage[];
  mode: AgentMode;
  intent?: EngineIntent;
  agentId?: string;
  model?: string;
  provider?: ProviderSelection;
  context?: EngineContext;
  runtime: RuntimeTarget;
  signal?: AbortSignal;
  metadata?: Record<string, string>;
  // Optional explicit tool request routed through the Engine (MCP-ready)
  toolRequest?: ToolCall;
}

export type EngineEvent =
  | { type: "request-start"; requestId: string }
  | { type: "intent-routed"; requestId: string; intent: EngineIntent }
  | { type: "context-ready"; requestId: string; sourceCount: number }
  | { type: "assistant-start"; requestId: string; messageId: string; model: string }
  | { type: "assistant-delta"; requestId: string; messageId: string; delta: string }
  | { type: "tool-request"; requestId: string; call: ToolCall }
  | { type: "tool-result"; requestId: string; result: ToolResult }
  | { type: "usage"; requestId: string; usage: TokenUsage }
  | { type: "completed"; requestId: string; messageId: string; finishReason: string }
  | { type: "failed"; requestId: string; error: EngineError };

export interface SynthEngine {
  run(request: EngineRequest): AsyncIterable<EngineEvent>;
}
