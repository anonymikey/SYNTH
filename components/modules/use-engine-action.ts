"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readSseEvents } from "@/lib/transport/sse";
import type { EngineEvent, EngineRequest } from "@/engine/types";
import type { AgentMode, ChatContextView, ProjectSummary } from "@/types/workspace";
import type { ModuleAction, ModuleActionResult, ModuleActionState } from "@/components/modules/types";

interface UseEngineActionOptions {
  project: ProjectSummary;
  context: ChatContextView;
  modelId?: string;
}

interface EngineActionError {
  message: string;
  unavailable: boolean;
}

export function buildModuleEngineRequest(action: ModuleAction, project: ProjectSummary, context: ChatContextView, modelId = "llama3.1:8b"): EngineRequest {
  const payloadText = Object.entries(action.payload ?? {}).map(([key, value]) => `${key}: ${value}`).join("\n");
  const explicitText = [action.label, payloadText].filter(Boolean).join("\n");
  return {
    requestId: crypto.randomUUID(),
    messages: [{ role: "user", content: explicitText }],
    mode: modeForIntent(action.intent),
    intent: action.intent,
    agentId: action.payload?.agentId,
    model: modelId,
    runtime: "web",
    context: {
      projectId: project.id,
      selectedFile: action.payload?.path ?? context.selectedFile,
      recentFiles: context.recentFiles,
      knowledgeIds: context.knowledge.map((item) => item.id),
      explicitText,
    },
    metadata: {
      source: "synth-module",
      actionId: action.id,
      intent: action.intent,
    },
  };
}

function modeForIntent(intent: ModuleAction["intent"]): AgentMode {
  if (intent === "research") return "researcher";
  if (intent === "planning") return "architect";
  return "assistant";
}

function toEngineError(event: Extract<EngineEvent, { type: "failed" }>): EngineActionError {
  return {
    message: event.error.message,
    unavailable: event.error.code === "provider" || event.error.code === "unknown",
  };
}

export function useEngineAction({ project, context, modelId }: UseEngineActionOptions) {
  const [state, setState] = useState<ModuleActionState>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const runAction = useCallback(async (action: ModuleAction): Promise<ModuleActionResult> => {
    abortRef.current?.abort();
    setState("loading");
    setOutput("");
    setError("");
    setModel("");

    const controller = new AbortController();
    abortRef.current = controller;
    let responseText = "";
    let responseModel = "";

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(buildModuleEngineRequest(action, project, context, modelId)),
      });
      if (!response.ok) throw new Error(`SYNTH Engine request failed (${response.status})`);

      for await (const event of readSseEvents<EngineEvent>(response)) {
        if (event.type === "assistant-start") {
          responseModel = event.model;
          setModel(event.model);
        }
        if (event.type === "assistant-delta") {
          responseText += event.delta;
          setOutput(responseText);
        }
        if (event.type === "failed") {
          const engineError = toEngineError(event);
          throw engineError;
        }
      }

      setState("success");
      return { state: "success", output: responseText, model: responseModel };
    } catch (caughtError) {
      if (controller.signal.aborted) {
        const abortedResult: ModuleActionResult = { state: "error", output: responseText, error: "The SYNTH Engine request was stopped." };
        setState(abortedResult.state);
        setError(abortedResult.error ?? "The request was stopped.");
        return abortedResult;
      }
      const engineError = isEngineActionError(caughtError) ? caughtError : { message: caughtError instanceof Error ? caughtError.message : "The SYNTH Engine could not complete this action.", unavailable: false };
      const result: ModuleActionResult = { state: engineError.unavailable ? "unavailable" : "error", output: responseText, error: engineError.message, model: responseModel };
      setState(result.state);
      setError(result.error ?? "The SYNTH Engine action failed.");
      return result;
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [context, modelId, project]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { state, output, error, model, runAction };
}

function isEngineActionError(value: unknown): value is EngineActionError {
  return Boolean(value && typeof value === "object" && "message" in value && "unavailable" in value);
}
