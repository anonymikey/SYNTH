import type { AIMessage, ProviderId, ProviderSelection } from "@/lib/ai/types";
import type { EngineIntent, EngineRequest, RuntimeTarget } from "@/engine/types";
import type { AgentMode } from "@/types/workspace";

const modes = new Set<AgentMode>(["assistant", "architect", "researcher", "reviewer"]);
const intents = new Set<EngineIntent>(["conversation", "coding", "research", "review", "planning", "vision", "unknown"]);
const runtimes = new Set<RuntimeTarget>(["web", "desktop", "mobile"]);
const providers = new Set<ProviderId>(["ollama", "openai", "anthropic", "gemini", "openrouter", "custom-local", "mock"]);

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body must be an object.");
  return value as Record<string, unknown>;
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} is required.`);
  return value.trim();
}

export function parseEngineRequest(input: unknown): EngineRequest {
  const body = asRecord(input);
  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) throw new Error("At least one message is required.");

  const messages: AIMessage[] = rawMessages.map((rawMessage) => {
    const record = asRecord(rawMessage);
    const role = record.role;
    if (role !== "system" && role !== "user" && role !== "assistant" && role !== "tool") throw new Error("Message role is invalid.");
    return { role, content: asString(record.content, "Message content") };
  });

  const mode = asString(body.mode ?? "assistant", "mode") as AgentMode;
  const intent = body.intent === undefined ? undefined : asString(body.intent, "intent") as EngineIntent;
  const agentId = body.agentId === undefined ? undefined : asString(body.agentId, "agentId");
  const runtime = asString(body.runtime ?? "web", "runtime") as RuntimeTarget;
  if (!modes.has(mode)) throw new Error("Agent mode is invalid.");
  if (intent && !intents.has(intent)) throw new Error("Engine intent is invalid.");
  if (!runtimes.has(runtime)) throw new Error("Runtime target is invalid.");

  const providerRecord = body.provider ? asRecord(body.provider) : undefined;
  let provider: ProviderSelection | undefined;
  if (providerRecord) {
    const providerId = asString(providerRecord.providerId, "provider.providerId") as ProviderId;
    if (!providers.has(providerId)) throw new Error("Provider is invalid.");
    provider = { providerId, model: asString(providerRecord.model, "provider.model"), allowFallback: providerRecord.allowFallback !== false };
  }

  const toolRequestRaw = body.toolRequest;
  let toolRequest = undefined as EngineRequest["toolRequest"] | undefined;
  if (toolRequestRaw !== undefined) {
    const toolObj = asRecord(toolRequestRaw);
    const toolId = asString(toolObj.toolId, "toolRequest.toolId");
    const callId = typeof toolObj.id === "string" && toolObj.id ? toolObj.id : crypto.randomUUID();
    const input = toolObj.input ?? undefined;
    toolRequest = { id: callId, toolId, input };
  }

  const toolApprovalRaw = body.toolApproval;
  let toolApproval: EngineRequest["toolApproval"] | undefined;
  if (toolApprovalRaw !== undefined) {
    const approvalObj = asRecord(toolApprovalRaw);
    const token = asString(approvalObj.token, "toolApproval.token");
    toolApproval = { token };
  }

  return {
    requestId: typeof body.requestId === "string" && body.requestId ? body.requestId : crypto.randomUUID(),
    messages,
    mode,
    intent,
    agentId,
    model: typeof body.model === "string" ? body.model : undefined,
    provider,
    runtime,
    context: body.context ? (asRecord(body.context) as EngineRequest["context"]) : undefined,
    metadata: body.metadata ? (asRecord(body.metadata) as Record<string, string>) : undefined,
    toolRequest,
    toolApproval,
  };
}

