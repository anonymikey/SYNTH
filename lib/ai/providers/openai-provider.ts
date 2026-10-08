import { createProviderError } from "@/lib/ai/errors";
import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth, TokenUsage } from "@/lib/ai/types";

type Chunk = { choices?: Array<{ delta?: { content?: string } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };

function formatMessagesForOpenAI(messages: import("@/lib/ai/types").AIMessage[]) {
  return messages.map((m) => {
    if (typeof m.content === "string") return m;
    if (Array.isArray(m.content)) {
      return {
        role: m.role,
        content: m.content.map((part) => {
          if (part.type === "text") return { type: "text", text: part.text };
          if (part.type === "image") return { type: "image_url", image_url: { url: part.url } };
          return part;
        }),
      };
    }
    return m;
  });
}

export class OpenAIProvider implements AIProvider {
  readonly id = "openai" as const;
  readonly label = "OpenAI";
  readonly capabilities = { streaming: true, vision: true, tools: false, embeddings: false, jsonMode: true, local: false };
  constructor(private readonly apiKey: string | undefined, private readonly baseUrl = "https://api.openai.com/v1") {}
  async listModels(): Promise<ModelInfo[]> { return []; }
  async healthCheck(): Promise<ProviderHealth> { return { providerId: this.id, status: this.apiKey ? "connected" : "offline", checkedAt: new Date().toISOString(), message: this.apiKey ? undefined : "OPENAI_API_KEY is not configured." }; }
  async complete(request: ChatRequest): Promise<AIResponse> { let content = ""; let usage: TokenUsage | undefined; for await (const event of this.streamChat({ ...request, stream: true })) { if (event.type === "text-delta") content += event.delta; if (event.type === "usage") usage = event.usage; if (event.type === "error") throw new Error(event.error.message); } return { id: crypto.randomUUID(), model: request.model, content, finishReason: "stop", usage }; }
  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID();
    if (!this.apiKey) { yield { type: "error", messageId, error: createProviderError(this.id, "configuration", "OpenAI is not configured on the server.") }; return; }
    let response: Response;
    try { response = await fetch(`${this.baseUrl}/chat/completions`, { method: "POST", signal: request.signal, headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: request.model, messages: formatMessagesForOpenAI(request.messages), stream: true, temperature: request.temperature, max_tokens: request.maxTokens }) }); }
    catch (cause) { yield { type: "error", messageId, error: createProviderError(this.id, request.signal?.aborted ? "aborted" : "connection", request.signal?.aborted ? "Generation was stopped." : "OpenAI is unavailable.", { retryable: !request.signal?.aborted, cause }) }; return; }
    if (!response.ok || !response.body) { const code = response.status === 401 || response.status === 403 ? "authentication" : response.status === 408 || response.status === 429 ? "rate-limit" : response.status === 400 ? "invalid-request" : "upstream"; yield { type: "error", messageId, error: createProviderError(this.id, code, code === "authentication" ? "OpenAI authentication failed." : code === "rate-limit" ? "OpenAI rate limit or quota reached." : `OpenAI returned ${response.status || "an empty response"}.`, { retryable: response.status === 408 || response.status === 429 || response.status >= 500 }) }; return; }
    yield { type: "message-start", messageId, model: request.model };
    const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
    try { while (true) { const { value, done } = await reader.read(); buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done }); const lines = buffer.split("\n"); buffer = lines.pop() ?? ""; for (const line of lines) { if (!line.startsWith("data:")) continue; const data = line.slice(5).trim(); if (data === "[DONE]") { yield { type: "done", messageId, finishReason: "stop" }; continue; } const chunk = JSON.parse(data) as Chunk; const delta = chunk.choices?.[0]?.delta?.content; if (delta) yield { type: "text-delta", messageId, delta }; if (chunk.usage) yield { type: "usage", messageId, usage: { inputTokens: chunk.usage.prompt_tokens ?? 0, outputTokens: chunk.usage.completion_tokens ?? 0, totalTokens: chunk.usage.total_tokens ?? 0 } }; } if (done) break; } } catch (cause) { yield { type: "error", messageId, error: createProviderError(this.id, "parse", "OpenAI returned an invalid stream.", { cause }) }; } finally { reader.releaseLock(); }
  }
}

export async function testOpenAI(model: string): Promise<string> { const key = process.env.OPENAI_API_KEY; if (!key) return "AUTH ERROR"; try { const response = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with OK." }], max_tokens: 2 }), cache: "no-store" }); if (response.ok) return "SUCCESS"; if (response.status === 401 || response.status === 403) return "AUTH ERROR"; if (response.status === 429) return "RATE LIMITED"; if (response.status === 400 || response.status === 404) return "INVALID MODEL"; return "UNAVAILABLE"; } catch { return "ERROR"; } }
