import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth } from "@/lib/ai/types";

const model: ModelInfo = { id: "synth-demo", label: "SYNTH Demo Model", providerId: "mock", contextWindow: 32000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true } };

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function textFromMessages(request: ChatRequest) {
  const last = request.messages.at(-1)?.content;
  if (typeof last === "string") return last;
  return "your request";
}

export class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly label = "SYNTH Demo";
  readonly capabilities = model.capabilities;

  async listModels(): Promise<ModelInfo[]> { return [model]; }

  async healthCheck(): Promise<ProviderHealth> {
    return { providerId: this.id, status: "connected", latencyMs: 12, model: model.id, checkedAt: new Date().toISOString() };
  }

  async complete(request: ChatRequest): Promise<AIResponse> {
    let content = "";
    for await (const event of this.streamChat(request)) if (event.type === "text-delta") content += event.delta;
    return { id: crypto.randomUUID(), model: request.model || model.id, content, finishReason: "stop" };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID();
    const answer = `I’m mapping “${textFromMessages(request)}” against the active SYNTH workspace. The Synth Engine has assembled local project context and will keep the provider layer replaceable as the platform grows.`;
    yield { type: "message-start", messageId, model: request.model || model.id };
    for (const delta of answer.split(/(\s+)/)) {
      if (request.signal?.aborted) {
        yield { type: "error", messageId, error: { providerId: this.id, code: "aborted", message: "Generation was stopped.", retryable: false } };
        return;
      }
      await sleep(12);
      yield { type: "text-delta", messageId, delta };
    }
    yield { type: "done", messageId, finishReason: "stop" };
  }
}
