"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { readSseEvents } from "@/lib/transport/sse";
import { chatReducer, initialChatState } from "@/modules/chat/chat-reducer";
import type { EngineEvent } from "@/engine/types";
import type { ChatMessage } from "@/modules/chat/types";
import type { AgentMode, ChatContextView, ProjectSummary } from "@/types/workspace";

interface UseAssistantChatOptions {
  project: ProjectSummary;
  context: ChatContextView;
  modelId: string;
  agentMode: AgentMode;
}

export function useAssistantChat({ project, context, modelId, agentMode }: UseAssistantChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);

  const sendPrompt = useCallback(async (prompt: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: prompt, createdAt: new Date().toISOString(), status: "complete" };
    const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString(), status: "pending" };
    dispatch({ type: "user-message", message: userMessage, requestId });
    dispatch({ type: "assistant-start", message: assistantMessage });

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          requestId,
          messages: [{ role: "user", content: prompt }],
          mode: agentMode,
          model: modelId,
          runtime: "web",
          context: { projectId: project.id, selectedFile: context.selectedFile, recentFiles: context.recentFiles, knowledgeIds: context.knowledge.map((item) => item.id) },
        }),
      });

      if (!response.ok) throw new Error(`SYNTH Engine request failed (${response.status})`);

      for await (const event of readSseEvents<EngineEvent>(response)) {
        if (event.type === "assistant-delta") dispatch({ type: "assistant-delta", messageId: assistantId, delta: event.delta });
        if (event.type === "completed") dispatch({ type: "completed", messageId: assistantId });
        if (event.type === "failed") dispatch({ type: "failed", messageId: assistantId, error: event.error.message });
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      dispatch({ type: "failed", messageId: assistantId, error: error instanceof Error ? error.message : "The assistant could not complete this request." });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [agentMode, context, modelId, project.id]);

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => { abortRef.current?.abort(); dispatch({ type: "reset" }); }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...state, sendPrompt, stop, reset };
}
