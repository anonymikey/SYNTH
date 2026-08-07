import type { AIStreamEvent } from "@/lib/ai/types";
import type { EngineEvent } from "@/engine/types";

export function processProviderEvent(event: AIStreamEvent, requestId: string): EngineEvent | undefined {
  if (event.type === "message-start") return { type: "assistant-start", requestId, messageId: event.messageId, model: event.model };
  if (event.type === "text-delta") return { type: "assistant-delta", requestId, messageId: event.messageId, delta: event.delta };
  if (event.type === "tool-call") return { type: "tool-request", requestId, call: { id: `${requestId}-${event.messageId}`, toolId: event.name, input: event.arguments } };
  if (event.type === "usage") return { type: "usage", requestId, usage: event.usage };
  if (event.type === "done") return { type: "completed", requestId, messageId: event.messageId, finishReason: event.finishReason };
  if (event.type === "error") return { type: "failed", requestId, error: { code: event.error.code === "aborted" ? "aborted" : "provider", message: event.error.message, retryable: event.error.retryable, cause: event.error.cause } };
  return undefined;
}
