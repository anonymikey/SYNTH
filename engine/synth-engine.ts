import type { AIMessage, ProviderSelection } from "@/lib/ai/types";
import type { AgentPort, KnowledgePort, MemoryPort, ProviderPort, SkillPort, ToolPort } from "@/engine/ports";
import { assembleContext } from "@/engine/context-assembler";
import { createEngineError, type EngineError } from "@/engine/errors";
import { routeIntent } from "@/engine/intent-router";
import { buildPrompt } from "@/engine/prompt-manager";
import { normalizeEngineRequest } from "@/engine/request-orchestrator";
import { processProviderEvent } from "@/engine/response-processor";
import type { EngineEvent, EngineRequest, SynthEngine } from "@/engine/types";
import type { AgentMode } from "@/types/workspace";

export interface SynthEngineDependencies {
  provider: ProviderPort;
  memory: MemoryPort;
  knowledge: KnowledgePort;
  tools?: ToolPort;
  skills?: SkillPort;
  agents?: AgentPort;
  defaultSelection: ProviderSelection;
}

export function createSynthEngine(dependencies: SynthEngineDependencies): SynthEngine {
  return {
    async *run(input: EngineRequest): AsyncIterable<EngineEvent> {
      const request = normalizeEngineRequest(input);
      yield { type: "request-start", requestId: request.requestId };
      const intent = routeIntent(request);
      yield { type: "intent-routed", requestId: request.requestId, intent };
      const query = getLatestUserText(request.messages);

      try {
        const context = await assembleContext(request.context, query, { memory: dependencies.memory, knowledge: dependencies.knowledge });
        yield { type: "context-ready", requestId: request.requestId, sourceCount: context.memory.length + context.knowledge.length + context.files.length };
        if (request.agentId) {
          const agent = await dependencies.agents?.resolve(intent, request.mode, request.agentId);
          if (!agent || agent.id !== request.agentId) throw createEngineError("routing", `SYNTH Agent ${request.agentId} is not available for ${intent}.`, { retryable: false });
        }
        const selection = request.provider ?? { ...dependencies.defaultSelection, model: request.model ?? dependencies.defaultSelection.model };
        const provider = await dependencies.provider.resolve(selection);
        const messages = buildPrompt(request.messages, intent, context);
        for await (const providerEvent of provider.streamChat({ messages, model: selection.model, stream: true, signal: request.signal, context: { projectId: request.context?.projectId, selectedFile: request.context?.selectedFile, recentFiles: context.files, explicitText: request.context?.explicitText } })) {
          const event = processProviderEvent(providerEvent, request.requestId);
          if (event) yield event;
        }
      } catch (error) {
        const engineError = isEngineError(error) ? error : createEngineError(request.signal?.aborted ? "aborted" : "provider", error instanceof Error ? error.message : "The SYNTH Engine could not complete this request.", { retryable: !request.signal?.aborted, cause: error });
        yield { type: "failed", requestId: request.requestId, error: engineError };
      }
    },
  };
}

function isEngineError(value: unknown): value is EngineError {
  return Boolean(value && typeof value === "object" && "code" in value && "message" in value && "retryable" in value);
}

function getLatestUserText(messages: AIMessage[]): string {
  const message = [...messages].reverse().find((item) => item.role === "user");
  return typeof message?.content === "string" ? message.content : "current request";
}

export function createDefaultEngineDependencies(dependencies: Omit<SynthEngineDependencies, "defaultSelection">): SynthEngineDependencies {
  return { ...dependencies, defaultSelection: { providerId: "ollama", model: "llama3.1:8b", allowFallback: true } };
}

export type EngineAgentMode = AgentMode;
