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

          // Resolve the explicit agent (if provided) so we can validate tool permissions later
          let resolvedAgent: import("@/agents/types").AgentDefinition | undefined = undefined;
          if (request.agentId) {
            resolvedAgent = await dependencies.agents?.resolve(intent, request.mode, request.agentId);
            if (!resolvedAgent || resolvedAgent.id !== request.agentId) throw createEngineError("routing", `SYNTH Agent ${request.agentId} is not available for ${intent}.`, { retryable: false });
          }

          // If the request includes an explicit tool call, route it through the Engine tool port (MCP-ready)
          if (request.toolRequest) {
            // Phase 1 hardening: require explicit agentId for any tool execution
            if (!request.agentId) throw createEngineError("authorization", "Tool execution requires an explicit agentId for authorization.", { retryable: false });

            if (!dependencies.tools) throw createEngineError("routing", "No tool runtime is available to execute the requested tool.", { retryable: false });

            // Resolve agent strictly for authorization (do not fall back to mode-based mapping)
            const agent = await dependencies.agents?.resolve(intent, request.mode, request.agentId);
            if (!agent || agent.id !== request.agentId) throw createEngineError("authorization", `SYNTH Agent ${request.agentId} is not available for ${intent}.`, { retryable: false });

            // Use server-side tool policy to determine whether execution is authorized
            const { ToolPolicy } = await import("@/lib/ai/tool-policy");
            const auth = ToolPolicy.authorizeExecution(request.agentId, intent, request.toolRequest.toolId);
            if (!auth.ok) throw createEngineError("authorization", `Tool authorization failed: ${auth.reason}`, { retryable: false });

            const available = await dependencies.tools.listAvailable({ requestId: request.requestId, projectId: request.context?.projectId, runtime: request.runtime, approved: false });
            const toolDef = available.find((t) => t.id === request.toolRequest?.toolId);
            if (!toolDef) throw createEngineError("routing", `Tool ${request.toolRequest.toolId} is not available.`, { retryable: false });
            if (!toolDef.enabled) throw createEngineError("routing", `Tool ${request.toolRequest.toolId} is disabled.`, { retryable: false });

            // If this request includes an approval token, attempt to consume and execute. Otherwise create an approval request.
            if (!request.toolApproval) {
              const { ToolApproval } = await import("@/lib/ai/tool-approval");
              const approval = await ToolApproval.create(request.requestId, request.agentId!, intent, request.toolRequest);
              // Emit approval-required event with opaque token and stop
              yield { type: "approval-required", requestId: request.requestId, approvalToken: approval.token, call: request.toolRequest } as import("@/engine/types").EngineEvent;
              return;
            }

            // Continuation: consume approval token and execute
            const { ToolApproval } = await import("@/lib/ai/tool-approval");
            const consumed = await ToolApproval.consume(request.toolApproval.token);
            if (!consumed.ok) throw createEngineError("authorization", `Tool approval failed: ${consumed.reason}`, { retryable: false });
            const record = consumed.record!;

            // Validate approval binding
            if (record.agentId !== request.agentId) throw createEngineError("authorization", `Tool approval token does not belong to agent ${request.agentId}`, { retryable: false });
            if (record.toolId !== request.toolRequest?.toolId) throw createEngineError("authorization", `Tool approval toolId mismatch`, { retryable: false });
            if (record.requestId !== request.requestId) throw createEngineError("authorization", `Tool approval requestId mismatch`, { retryable: false });
            if (intent && record.intent && intent !== record.intent) throw createEngineError("authorization", `Tool approval intent mismatch`, { retryable: false });

            const callToExecute = { id: record.callId, toolId: record.toolId, input: record.input } as import("@/tools/types").ToolCall;
            // Audit: tool execution starting
            const { ConsoleAuditLogger } = await import("@/lib/ai/audit-logger");
            ConsoleAuditLogger.tool_execution_started({ requestId: request.requestId, agentId: record.agentId, toolId: record.toolId, callId: record.callId });
            yield { type: "tool-request", requestId: request.requestId, call: callToExecute };
            const result = await dependencies.tools.execute(callToExecute, { requestId: request.requestId, projectId: request.context?.projectId, runtime: request.runtime, approved: true });
            // Audit: completed
            ConsoleAuditLogger.tool_execution_completed({ requestId: request.requestId, agentId: record.agentId, toolId: record.toolId, callId: record.callId, status: result.status });
            yield { type: "tool-result", requestId: request.requestId, result };
            return;
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
