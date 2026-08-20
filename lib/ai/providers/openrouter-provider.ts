import { createProviderError } from "@/lib/ai/errors";
import { configuredModels, resolveConfiguredModel } from "@/lib/ai/models";
import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth, TokenUsage } from "@/lib/ai/types";

interface OpenRouterChunk { id?: string; model?: string; choices?: Array<{ delta?: { content?: string; role?: string }; finish_reason?: string | null }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }

export class OpenRouterProvider implements AIProvider {
  readonly id = "openrouter" as const;
  readonly label = "OpenRouter";
  readonly capabilities = { streaming: true, vision: true, tools: false, embeddings: false, jsonMode: true, local: false };

  constructor(private readonly apiKey: string | undefined, private readonly baseUrl: string) {}

  async listModels(signal?: AbortSignal): Promise<ModelInfo[]> {
    if (!this.apiKey) return configuredModels;
    try {
      const response = await fetch(`${this.baseUrl}/models`, { signal, headers: { Authorization: `Bearer ${this.apiKey}` }, next: { revalidate: 300 } });
      if (!response.ok) return configuredModels;
      const body = await response.json() as { data?: Array<{ id: string; name?: string; context_length?: number }> };
      const configured = new Map(configuredModels.map((model) => [model.id, model]));
      return (body.data ?? []).map((item) => configured.get(item.id)).filter((model): model is ModelInfo => Boolean(model));
    } catch { return configuredModels; }
  }

  async healthCheck(): Promise<ProviderHealth> {
    return { providerId: this.id, status: this.apiKey ? "connected" : "offline", model: configuredModels[0]?.id, checkedAt: new Date().toISOString(), message: this.apiKey ? undefined : "OPENROUTER_API_KEY is not configured." };
  }

  async complete(request: ChatRequest): Promise<AIResponse> {
    let content = ""; let finishReason: AIResponse["finishReason"] = "stop"; let usage: TokenUsage | undefined;
    for await (const event of this.streamChat({ ...request, stream: true })) {
      if (event.type === "text-delta") content += event.delta;
      if (event.type === "usage") usage = event.usage;
      if (event.type === "done") finishReason = event.finishReason;
      if (event.type === "error") throw new Error(event.error.message);
    }
    return { id: crypto.randomUUID(), model: request.model, content, finishReason, usage };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID(); const model = resolveConfiguredModel(request.model)?.id ?? request.model;
    if (!this.apiKey) { yield { type: "error", messageId, error: createProviderError(this.id, "configuration", "OpenRouter is not configured on the server.") }; return; }
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", signal: request.signal, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json", "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000", "X-Title": "SYNTH" }, body: JSON.stringify({ model, messages: request.messages, stream: true, temperature: request.temperature, max_tokens: request.maxTokens }) });
    } catch (error) { yield { type: "error", messageId, error: createProviderError(this.id, request.signal?.aborted ? "aborted" : "connection", request.signal?.aborted ? "Generation was stopped." : "OpenRouter is unavailable.", { retryable: !request.signal?.aborted, cause: error }) }; return; }
    if (!response.ok || !response.body) {
      const code = response.status === 401 || response.status === 403 ? "authentication" : response.status === 429 ? "rate-limit" : response.status === 400 ? "invalid-request" : "upstream";
      yield { type: "error", messageId, error: createProviderError(this.id, code, code === "authentication" ? "OpenRouter authentication failed." : code === "rate-limit" ? "OpenRouter rate limit reached." : `OpenRouter returned ${response.status || "an empty response"}.`, { retryable: response.status === 429 || response.status >= 500 }) }; return;
    }
    yield { type: "message-start", messageId, model };
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ""; let emittedText = false;
    try {
      while (true) {
        const { value, done } = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim(); if (data === "[DONE]") { yield { type: "done", messageId, finishReason: "stop" }; continue; }
          const chunk = JSON.parse(data) as OpenRouterChunk; const choice = chunk.choices?.[0]; const delta = choice?.delta?.content;
          if (delta) { emittedText = true; yield { type: "text-delta", messageId, delta }; }
          if (chunk.usage) yield { type: "usage", messageId, usage: { inputTokens: chunk.usage.prompt_tokens ?? 0, outputTokens: chunk.usage.completion_tokens ?? 0, totalTokens: chunk.usage.total_tokens ?? 0 } };
        }
        if (done) break;
      }
      if (!emittedText) yield { type: "error", messageId, error: createProviderError(this.id, "parse", "OpenRouter returned an empty response.") };
    } catch (error) { yield { type: "error", messageId, error: createProviderError(this.id, "parse", "OpenRouter returned an invalid stream.", { cause: error }) }; }
    finally { reader.releaseLock(); }
  }
}