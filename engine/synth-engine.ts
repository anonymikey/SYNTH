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
import { resolveSynthModelAsync } from "@/lib/ai/model-routing";
import { createExecutionPlan, recordStructuredOutcome, retrieveApprovedContext } from "@/agents/orchestrator";
import { AgentRegistry } from "@/agents/registry";

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
          // Resolve the explicit agent before context assembly so its memory and policy govern execution.
          let resolvedAgent: import("@/agents/types").AgentDefinition | undefined = undefined;
          if (request.agentId) {
            resolvedAgent = await dependencies.agents?.resolve(intent, request.mode, request.agentId);
            if (!resolvedAgent || resolvedAgent.id !== request.agentId) throw createEngineError("routing", `SYNTH Agent ${request.agentId} is not available for ${intent}.`, { retryable: false });
          }

          const context = await assembleContext(request.context, query, { memory: dependencies.memory, knowledge: dependencies.knowledge });
          if (resolvedAgent) {
            const approved = await retrieveApprovedContext(dependencies.memory, resolvedAgent, query);
            context.memory.push(...approved.map((item) => ({ content: item.content, scope: item.scope })));
          }
        yield { type: "context-ready", requestId: request.requestId, sourceCount: context.memory.length + context.knowledge.length + context.files.length };

          // If the request includes an explicit tool call, route it through the Engine tool port (MCP-ready)
          if (request.toolRequest || request.toolApproval) {
            // Phase 1 hardening: require explicit agentId for any tool execution
            if (!request.agentId) throw createEngineError("authorization", "Tool execution requires an explicit agentId for authorization.", { retryable: false });

            if (!dependencies.tools) throw createEngineError("routing", "No tool runtime is available to execute the requested tool.", { retryable: false });

            // If this request does not include an approval token, create an approval request.
            if (!request.toolApproval) {
              if (!request.toolRequest) throw createEngineError("routing", "Tool request is missing.", { retryable: false });

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
            if (request.toolRequest?.toolId && record.toolId !== request.toolRequest.toolId) throw createEngineError("authorization", `Tool approval toolId mismatch`, { retryable: false });
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

    const publicModel = request.model?.startsWith("synth-") ? request.model : (resolvedAgent?.modelPolicy ?? "SYNTH");
    const routedModel = request.model ?? resolvedAgent?.modelPolicy;
    const selection = request.provider ?? (routedModel ? await resolveSynthModelAsync(routedModel) : dependencies.defaultSelection);
    const provider = await dependencies.provider.resolve(selection);
          let messages = buildPrompt(request.messages, intent, context, resolvedAgent);
          if (resolvedAgent?.id === "orchestrator") {
            const executionPlan = createExecutionPlan(query);
            const handoffs: string[] = [];
            for (const step of executionPlan.steps.slice(0, 4)) {
              const specialist = AgentRegistry.resolve(step.agentId);
              if (!specialist) continue;
              const specialistPrompt = buildPrompt([{ role: "user", content: `${step.objective}\n\nReturn only concise findings, risks, and next action for the orchestrator.` }], intent, context, specialist);
              const specialistSelection = specialist.modelPolicy ? await resolveSynthModelAsync(specialist.modelPolicy) : selection;
              const specialistProvider = specialistSelection.providerId === selection.providerId ? provider : await dependencies.provider.resolve(specialistSelection);
              let specialistOutput = "";
              for await (const event of specialistProvider.streamChat({ messages: specialistPrompt, model: specialistSelection.model, stream: true, signal: request.signal, context: { projectId: request.context?.projectId, selectedFile: request.context?.selectedFile, recentFiles: context.files, explicitText: request.context?.explicitText } })) {
                if (event.type === "text-delta") specialistOutput += event.delta;
              }
              handoffs.push(`${specialist.id}: ${specialistOutput.slice(0, specialist.handoffRules?.maxContextChars ?? 5000)}`);
            }
            messages = [{ role: "system", content: `You are the SYNTH Orchestrator. Synthesize these bounded specialist handoffs into an actionable result. Do not expose hidden reasoning or provider details.\n\n${handoffs.join("\n\n")}` }, ...request.messages];
          }
          let responseText = "";
          for await (const providerEvent of provider.streamChat({ messages, model: selection.model, stream: true, signal: request.signal, context: { projectId: request.context?.projectId, selectedFile: request.context?.selectedFile, recentFiles: context.files, explicitText: request.context?.explicitText } })) {
            if (providerEvent.type === "text-delta") responseText += providerEvent.delta;
            const event = processProviderEvent(providerEvent, request.requestId, publicModel);
            if (event) {
              yield event;
              if (event.type === "completed" && resolvedAgent) {
                await recordStructuredOutcome(dependencies.memory, resolvedAgent, request.context?.projectId ?? "unscoped", { plan: resolvedAgent.workflow ?? [], affectedFiles: context.files.map((file) => file.path), findings: [responseText.slice(0, 4000)], proposedChanges: [], risks: [], tests: resolvedAgent.successCriteria ?? [], result: responseText.slice(0, 2000), nextAction: resolvedAgent.deliverables?.[0] ?? "Review the result." });
              }
            }
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
