export type ProviderId =
  | "ollama"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "custom-local"
  | "mock";

export type MessageRole = "system" | "user" | "assistant" | "tool";
export type ProviderStatus = "connected" | "degraded" | "offline" | "unsupported";
export type FinishReason = "stop" | "length" | "tool-call" | "error";

export interface AIContentPartText {
  type: "text";
  text: string;
}

export interface AIContentPartImage {
  type: "image";
  url: string;
  mimeType?: string;
}

export type AIContentPart = AIContentPartText | AIContentPartImage;

export interface AIMessage {
  id?: string;
  role: MessageRole;
  content: string | AIContentPart[];
  name?: string;
  toolCallId?: string;
}

export interface AIProviderCapabilities {
  streaming: boolean;
  vision: boolean;
  tools: boolean;
  embeddings: boolean;
  jsonMode: boolean;
  local: boolean;
}

export interface AIChatContext {
  projectId?: string;
  selectedFile?: string;
  recentFiles?: Array<{ path: string; kind: string }>;
  knowledge?: Array<{ title: string; summary: string }>;
  explicitText?: string;
}

export interface ChatRequest {
  messages: AIMessage[];
  model: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  signal?: AbortSignal;
  context?: AIChatContext;
  metadata?: Record<string, string>;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ModelInfo {
  id: string;
  label: string;
  providerId: ProviderId;
  contextWindow?: number;
  capabilities: AIProviderCapabilities;
}

export interface ProviderHealth {
  providerId: ProviderId;
  status: ProviderStatus;
  latencyMs?: number;
  model?: string;
  message?: string;
  checkedAt: string;
}

export type ProviderErrorCode = "configuration" | "connection" | "authentication" | "rate-limit" | "invalid-request" | "upstream" | "parse" | "aborted" | "unsupported" | "unknown";

export interface ProviderError {
  code: ProviderErrorCode;
  message: string;
  retryable: boolean;
  providerId: ProviderId;
  cause?: unknown;
}

export type AIStreamEvent =
  | { type: "message-start"; messageId: string; model: string }
  | { type: "text-delta"; messageId: string; delta: string }
  | { type: "tool-call"; messageId: string; name: string; arguments: unknown }
  | { type: "usage"; messageId: string; usage: TokenUsage }
  | { type: "done"; messageId: string; finishReason: FinishReason }
  | { type: "error"; messageId?: string; error: ProviderError };

export interface AIResponse {
  id: string;
  model: string;
  content: string;
  finishReason: FinishReason;
  usage?: TokenUsage;
}

export interface AIProvider {
  readonly id: ProviderId;
  readonly label: string;
  readonly capabilities: AIProviderCapabilities;
  listModels(signal?: AbortSignal): Promise<ModelInfo[]>;
  healthCheck(signal?: AbortSignal): Promise<ProviderHealth>;
  complete(request: ChatRequest): Promise<AIResponse>;
  streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent>;
}

export interface ProviderSelection {
  providerId: ProviderId;
  model: string;
  allowFallback: boolean;
}
