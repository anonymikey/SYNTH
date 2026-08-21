"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { readSseEvents } from "@/lib/transport/sse";
import { chatReducer, initialChatState } from "@/modules/chat/chat-reducer";
import type { ChatMessage } from "@/modules/chat/types";
import type { EngineEvent } from "@/engine/types";
import type { AgentMode, ChatContextView, ProjectSummary } from "@/types/workspace";
import type { AIMessage } from "@/lib/ai/types";
import { ConversationStore } from "@/modules/conversation/store";

interface UseAssistantChatOptions {
  project: ProjectSummary;
  context: ChatContextView;
  modelId: string;
  providerId: string;
  agentMode: AgentMode;
  conversationId?: string;
  onMessagesChange?: (messages: ChatMessage[]) => void;
}

export function useAssistantChat({
  project,
  context,
  modelId,
  providerId,
  agentMode,
  conversationId,
  onMessagesChange,
}: UseAssistantChatOptions) {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Hydrate from conversation store when conversationId changes
  useEffect(() => {
    if (!conversationId) {
      dispatch({ type: "reset" });
      return;
    }
    const stored = ConversationStore.get(conversationId);
    if (stored && stored.messages.length > 0) {
      dispatch({ type: "hydrate", messages: stored.messages });
    } else {
      dispatch({ type: "reset" });
    }
  }, [conversationId]);

  // Persist messages after each state change
  useEffect(() => {
    if (!conversationId) return;
    // Don't persist while streaming — only persist final states
    if (state.isStreaming) return;
    if (state.messages.length === 0) return;
    ConversationStore.save({
      id: conversationId,
      title: generateTitle(state.messages),
      messages: state.messages,
      agentMode,
      modelId,
      providerId,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    onMessagesChange?.(state.messages);
  }, [conversationId, state.messages, state.isStreaming, agentMode, modelId, providerId, onMessagesChange]);

  const sendPrompt = useCallback(
    async (prompt: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
        status: "complete",
      };
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "pending",
      };
      dispatch({ type: "user-message", message: userMessage, requestId });
      dispatch({ type: "assistant-start", message: assistantMessage });

      try {
        const conversation: AIMessage[] = [
          ...stateRef.current.messages,
          userMessage,
        ].map((message) => ({
          role: message.role,
          content: message.content,
        }));

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            requestId,
            messages: conversation,
            mode: agentMode,
            model: modelId,
            provider: {
              providerId,
              model: modelId,
              allowFallback: modelId === "auto",
            },
            runtime: "web",
            context: {
              projectId: project.id,
              selectedFile: context.selectedFile,
              recentFiles: context.recentFiles,
              knowledgeIds: context.knowledge.map((item) => item.id),
            },
          }),
        });

        if (!response.ok) {
          const body = await response
            .json()
            .catch(() => undefined) as { error?: string } | undefined;
          throw new Error(
            body?.error || "SYNTH provider is currently unavailable."
          );
        }

        for await (const event of readSseEvents<EngineEvent>(response)) {
          if (event.type === "assistant-delta")
            dispatch({
              type: "assistant-delta",
              messageId: assistantId,
              delta: event.delta,
            });
          if (event.type === "completed")
            dispatch({ type: "completed", messageId: assistantId });
          if (event.type === "approval-required")
            dispatch({ type: "approval-required", messageId: assistantId });
          if (event.type === "failed")
            dispatch({
              type: "failed",
              messageId: assistantId,
              error: event.error.message,
            });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: "failed",
          messageId: assistantId,
          error:
            error instanceof Error
              ? error.message
              : "The assistant could not complete this request.",
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [agentMode, context, modelId, project.id, providerId]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);
  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...state, sendPrompt, stop, reset };
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text =
    typeof firstUser.content === "string"
      ? firstUser.content
      : String(firstUser.content);
  const trimmed = text.slice(0, 60).trim();
  return trimmed.length < text.length ? `${trimmed}…` : trimmed || "New conversation";
}
