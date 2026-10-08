import { createProviderError } from "@/lib/ai/errors";
import type {
  AIProvider,
  AIResponse,
  AIStreamEvent,
  ChatRequest,
  ModelInfo,
  ProviderHealth,
  TokenUsage,
} from "@/lib/ai/types";

const defaultGeminiModel = "gemini-3.8-flash";

const geminiModels: ModelInfo[] = [
  {
    id: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    providerId: "gemini",
    contextWindow: 1048576,
    capabilities: { streaming: true, vision: true, tools: false, embeddings: false, jsonMode: true, local: false },
  },
];

export class GeminiProvider implements AIProvider {
  readonly id = "gemini" as const;
  readonly label = "Gemini";
  readonly capabilities = { streaming: true, vision: true, tools: false, embeddings: false, jsonMode: true, local: false };

  constructor(private readonly apiKey: string | undefined) {}

  async listModels(): Promise<ModelInfo[]> {
    return geminiModels;
  }

  async healthCheck(): Promise<ProviderHealth> {
    const isConfigured = Boolean(this.apiKey && this.apiKey.startsWith("AIza"));
    return {
      providerId: this.id,
      status: isConfigured ? "connected" : "offline",
      model: defaultGeminiModel,
      checkedAt: new Date().toISOString(),
      message: isConfigured ? undefined : "GEMINI_API_KEY is not configured.",
    };
  }

  async complete(request: ChatRequest): Promise<AIResponse> {
    let content = "";
    let usage: TokenUsage | undefined;
    for await (const event of this.streamChat({ ...request, stream: true })) {
      if (event.type === "text-delta") content += event.delta;
      if (event.type === "usage") usage = event.usage;
      if (event.type === "error") throw new Error(event.error.message);
    }
    return { id: crypto.randomUUID(), model: request.model || defaultGeminiModel, content, finishReason: "stop", usage };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID();
    const model = request.model && request.model.startsWith("gemini-")
      ? request.model
      : defaultGeminiModel;

    if (!this.apiKey || !this.apiKey.startsWith("AIza")) {
      yield {
        type: "error",
        messageId,
        error: createProviderError(this.id, "configuration", "Gemini is not configured on the server."),
      };
      return;
    }

    // Format messages for Gemini API
    const contents = request.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        const role = m.role === "assistant" ? "model" : "user";
        if (typeof m.content === "string") {
          return { role, parts: [{ text: m.content }] };
        }
        if (Array.isArray(m.content)) {
          const parts: Array<Record<string, unknown>> = [];
          for (const part of m.content) {
            if (part.type === "text") parts.push({ text: part.text });
            if (part.type === "image") {
              const dataUrl = part.url;
              const match = /^data:(.+?);base64,(.+)$/.exec(dataUrl);
              if (match) {
                parts.push({
                  inline_data: {
                    mime_type: match[1],
                    data: match[2],
                  },
                });
              }
            }
          }
          return { role, parts: parts.length > 0 ? parts : [{ text: "" }] };
        }
        return { role, parts: [{ text: "" }] };
      });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        signal: request.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });
    } catch (cause) {
      yield {
        type: "error",
        messageId,
        error: createProviderError(
          this.id,
          request.signal?.aborted ? "aborted" : "connection",
          request.signal?.aborted ? "Generation was stopped." : "Gemini is unavailable.",
          { retryable: !request.signal?.aborted, cause }
        ),
      };
      return;
    }

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => "");
      console.error("[gemini-provider] Error response:", response.status, errorText);
      const code = response.status === 401 || response.status === 403 ? "authentication" : response.status === 429 ? "rate-limit" : "upstream";
      yield {
        type: "error",
        messageId,
        error: createProviderError(this.id, code, `Gemini returned status ${response.status}: ${errorText || "Unknown error"}`, {
          retryable: response.status === 429 || response.status >= 500,
        }),
      };
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
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const chunk = JSON.parse(data) as {
              candidates?: Array<{
                content?: { parts?: Array<{ text?: string }> };
                finishReason?: string;
              }>;
              usageMetadata?: {
                promptTokenCount?: number;
                candidatesTokenCount?: number;
                totalTokenCount?: number;
              };
            };

            const textDelta = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textDelta) {
              yield { type: "text-delta", messageId, delta: textDelta };
            }

            if (chunk.usageMetadata) {
              yield {
                type: "usage",
                messageId,
                usage: {
                  inputTokens: chunk.usageMetadata.promptTokenCount ?? 0,
                  outputTokens: chunk.usageMetadata.candidatesTokenCount ?? 0,
                  totalTokens: chunk.usageMetadata.totalTokenCount ?? 0,
                },
              };
            }
          } catch {
            // Ignore parse errors on individual SSE chunks
          }
        }

        if (done) break;
      }
      yield { type: "done", messageId, finishReason: "stop" };
    } catch (cause) {
      yield {
        type: "error",
        messageId,
        error: createProviderError(this.id, "parse", "Gemini stream reading error.", { cause }),
      };
    } finally {
      reader.releaseLock();
    }
  }
}
