import { createProviderError } from "@/lib/ai/errors";
import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth } from "@/lib/ai/types";

interface OllamaChunk {
  model?: string;
  message?: { content?: string; role?: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  readonly id = "ollama" as const;
  readonly label = "Ollama Local";
  readonly capabilities = { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true };

  constructor(private readonly baseUrl: string, private readonly defaultModel: string) {}

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal, cache: "no-store" });
      if (!response.ok) return [];
      const body = await response.json() as { models?: Array<{ name: string; details?: { parameter_size?: string } }> };
      return (body.models ?? []).map((item) => ({ id: item.name, label: item.details?.parameter_size ? `${item.name} · ${item.details.parameter_size}` : item.name, providerId: this.id, capabilities: this.capabilities }));
    } catch {
      return [];
    }
  }

  async healthCheck(signal?: AbortSignal): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal, cache: "no-store" });
      return { providerId: this.id, status: response.ok ? "connected" : "degraded", latencyMs: Date.now() - started, model: this.defaultModel, checkedAt: new Date().toISOString(), message: response.ok ? undefined : `Ollama returned ${response.status}.` };
    } catch (error) {
      return { providerId: this.id, status: "offline", latencyMs: Date.now() - started, model: this.defaultModel, checkedAt: new Date().toISOString(), message: error instanceof Error ? error.message : "Ollama is unavailable." };
    }
  }

  async complete(request: ChatRequest): Promise<AIResponse> {
    let content = "";
    let finishReason: AIResponse["finishReason"] = "stop";
    for await (const event of this.streamChat(request)) {
      if (event.type === "text-delta") content += event.delta;
      if (event.type === "done") finishReason = event.finishReason;
      if (event.type === "error") throw new Error(event.error.message);
    }
    return { id: crypto.randomUUID(), model: request.model || this.defaultModel, content, finishReason };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID();
    const model = request.model || this.defaultModel;
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/api/chat`, { method: "POST", signal: request.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: request.messages, stream: true, options: { temperature: request.temperature, num_predict: request.maxTokens } }) });
    } catch (error) {
      yield { type: "error", messageId, error: createProviderError(this.id, request.signal?.aborted ? "aborted" : "connection", request.signal?.aborted ? "Generation was stopped." : "Ollama is unavailable.", { retryable: !request.signal?.aborted, cause: error }) };
      return;
    }

    if (!response.ok || !response.body) {
      yield { type: "error", messageId, error: createProviderError(this.id, response.ok ? "upstream" : "connection", `Ollama returned ${response.status || "an empty response"}.`, { retryable: response.status >= 500 }) };
      return;
    }

    yield { type: "message-start", messageId, model };
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const chunk = JSON.parse(line) as OllamaChunk;
          if (chunk.message?.content) yield { type: "text-delta", messageId, delta: chunk.message.content };
          if (chunk.done) {
            if (chunk.prompt_eval_count !== undefined || chunk.eval_count !== undefined) yield { type: "usage", messageId, usage: { inputTokens: chunk.prompt_eval_count ?? 0, outputTokens: chunk.eval_count ?? 0, totalTokens: (chunk.prompt_eval_count ?? 0) + (chunk.eval_count ?? 0) } };
            yield { type: "done", messageId, finishReason: "stop" };
          }
        }
        if (done) break;
      }
    } catch (error) {
      yield { type: "error", messageId, error: createProviderError(this.id, "parse", "Ollama returned an invalid stream.", { retryable: false, cause: error }) };
    } finally {
      reader.releaseLock();
    }
  }
}
