"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { readSseEvents } from "@/lib/transport/sse";
import { chatReducer, initialChatState } from "@/modules/chat/chat-reducer";
import type { ChatMessage } from "@/modules/chat/types";
import type { EngineEvent } from "@/engine/types";
import type { AgentMode, ChatContextView, ProjectSummary } from "@/types/workspace";
import type { AIContentPart, AIMessage } from "@/lib/ai/types";
import { ConversationStore } from "@/modules/conversation/store";
import type { ComposerAttachment } from "@/components/assistant/prompt-composer";
import type { SynthHandoffAttachment } from "@/lib/handoff/types";
import {
  detectCapabilityIntent,
  createRecommendationFromIntent,
} from "@/lib/ai/capability-router";

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
  const conversationIdRef = useRef(conversationId);
  const previousConversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;

  // Hydrate from conversation store when conversationId changes.
  // Preserve optimistic messages when a new conversation is created by the first send.
  useEffect(() => {
    const pendingLocalConversation = previousConversationIdRef.current == null && conversationId != null && stateRef.current.messages.length > 0;
    previousConversationIdRef.current = conversationId;
    if (!conversationId) {
      // A new conversation is created immediately before the first request.
      // Keep the optimistic user message while the provider updates its id.
      if (stateRef.current.messages.length === 0) dispatch({ type: "reset" });
      return;
    }
    if (pendingLocalConversation) return;
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
    // Skip if conversationId changed during hydration — prevents saving
    // old conversation messages to the new conversation's store entry.
    if (conversationIdRef.current !== conversationId) return;
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
    async (prompt: string, composerAttachments?: ComposerAttachment[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestId = crypto.randomUUID();
      const assistantId = crypto.randomUUID();

      const normalizedAttachments: SynthHandoffAttachment[] = (composerAttachments ?? []).map((att) => ({
        id: att.id,
        name: att.name,
        kind: att.kind,
        size: att.size,
        mimeType: att.mimeType,
        url: att.previewUrl,
        dataUrl: att.dataUrl,
      }));

      // Capability Intent Detection
      const intentInput = {
        userMessage: prompt,
        attachments: normalizedAttachments,
        project,
        selectedFile: context.selectedFile,
      };
      const intentResult = detectCapabilityIntent(intentInput);
      const recommendation = createRecommendationFromIntent(intentResult, intentInput);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        createdAt: new Date().toISOString(),
        status: "complete",
        attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
      };

      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        status: "pending",
        recommendation: recommendation ?? undefined,
      };

      dispatch({ type: "user-message", message: userMessage, requestId });
      dispatch({ type: "assistant-start", message: assistantMessage });

      try {
        // Build multimodal messages array if images are attached
        const imageParts: AIContentPart[] = normalizedAttachments
          .filter((att) => att.kind === "image" && (att.dataUrl || att.url))
          .map((att) => ({
            type: "image",
            url: att.dataUrl || att.url!,
            mimeType: att.mimeType,
          }));

        const conversation: AIMessage[] = [
          ...stateRef.current.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          {
            role: "user",
            content: imageParts.length > 0
              ? [{ type: "text", text: prompt }, ...imageParts]
              : prompt,
          },
        ];

        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            requestId,
            messages: conversation,
            mode: agentMode,
            // Send SYNTH model ID (e.g. "auto", "synth-ultra", "synth-code").
            // The server resolves SYNTH IDs to internal provider/model selections.
            // Do NOT send a provider object — the browser does not know internal provider details.
            model: modelId,
            runtime: "web",
            intent: intentResult.intent === "image_analysis" || intentResult.intent === "image_generation"
              ? "vision"
              : intentResult.intent === "website_building" || intentResult.intent === "application_building" || intentResult.intent === "bug_fixing" || intentResult.intent === "refactoring"
              ? "coding"
              : intentResult.intent === "multi_agent_task"
              ? "planning"
              : "conversation",
            context: {
              projectId: project.id,
              selectedFile: context.selectedFile,
              recentFiles: context.recentFiles,
              knowledgeIds: context.knowledge.map((item) => item.id),
              explicitText: intentResult.assistantResponseHint,
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
    [agentMode, context, modelId, project]
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
