"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatThread } from "@/components/chat/chat-thread";
import { PromptComposer, type ComposerAttachment } from "@/components/assistant/prompt-composer";
import { SuggestionGrid } from "@/components/assistant/suggestion-grid";
import { WelcomeState } from "@/components/assistant/welcome-state";
import { DEFAULT_CONTEXT } from "@/lib/config/workspace";
import { useModelCatalog } from "@/modules/models/hooks/use-model-catalog";
import { SUGGESTED_PROMPTS } from "@/modules/assistant/constants";
import { useAssistantChat } from "@/modules/assistant/hooks/use-assistant-chat";
import { useConversations } from "@/modules/conversation/conversation-provider";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import type { AgentMode, ProjectSummary } from "@/types/workspace";

interface AssistantWorkspaceProps {
  project: ProjectSummary;
  conversationId?: string;
}

export function AssistantWorkspace({ project, conversationId }: AssistantWorkspaceProps) {
  const conversations = useConversations();
  const { models, routing } = useModelCatalog();
  const [prompt, setPrompt] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("assistant");
  const [modelId, setModelId] = useState("auto");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);

  const selectedModel = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);

  const activeIdRef = useRef<string | null>(conversationId ?? null);
  useEffect(() => {
    activeIdRef.current = conversationId ?? null;
  }, [conversationId]);

  const handleMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      const id = activeIdRef.current;
      if (!id) return;
      conversations.persistMessages(id, messages, {
        agentMode,
        modelId,
        providerId: "synth",
      });
    },
    [conversations, agentMode, modelId]
  );

  const chat = useAssistantChat({
    project,
    context: DEFAULT_CONTEXT,
    modelId,
    providerId: "synth",
    agentMode,
    conversationId,
    onMessagesChange: handleMessagesChange,
  });

  const showWelcome = chat.messages.length === 0;

  const ensureConversation = useCallback((): string => {
    if (activeIdRef.current) return activeIdRef.current;
    const id = conversations.create({ agentMode, modelId, providerId: "synth" });
    activeIdRef.current = id;
    return id;
  }, [conversations, agentMode, modelId]);

  const send = async () => {
    const nextPrompt = prompt.trim();
    if (!nextPrompt || chat.isStreaming) return;

    ensureConversation();

    const attachmentContext = attachments.length
      ? `\n\nAttached context: ${attachments.map((attachment) => attachment.name).join(", ")}`
      : "";
    setPrompt("");
    setAttachments([]);
    await chat.sendPrompt(`${nextPrompt}${attachmentContext}`);
  };

  const addAttachments = (files: File[]) => {
    const next = files.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      kind: file.type.startsWith("image/") ? ("image" as const) : ("file" as const),
      size: file.size,
    }));
    setAttachments((current) => [...current, ...next]);
    toast.success(`${next.length} attachment${next.length === 1 ? "" : "s"} added to the SYNTH prompt`);
  };

  const handleAction = async (message: { content: string }, action: MessageAction) => {
    if (action === "copy") {
      await navigator.clipboard?.writeText(message.content);
      toast.success("Response copied");
      return;
    }
    if (action === "regenerate") {
      await chat.sendPrompt(message.content);
      return;
    }
    if (action === "share") {
      if (navigator.share) {
        await navigator.share({ title: "SYNTH Assistant response", text: message.content });
      } else {
        await navigator.clipboard?.writeText(message.content);
        toast.success("Share fallback copied the response");
      }
      return;
    }
    toast.success(action === "like" ? "Thanks — response marked helpful" : "Feedback recorded");
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="synth-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--synth-cyan)_10%,transparent),transparent_70%)]" />

      {showWelcome ? (
        <div className="relative min-h-0 flex-1 overflow-y-auto">
          <WelcomeState />
          <div className="mx-auto max-w-4xl px-4 pb-6 sm:px-6">
            <SuggestionGrid
              suggestions={SUGGESTED_PROMPTS}
              onSelect={async (suggestion) => {
                if (chat.isStreaming) return;
                ensureConversation();
                setPrompt("");
                await chat.sendPrompt(suggestion.prompt);
              }}
            />
          </div>
        </div>
      ) : (
        <ChatThread messages={chat.messages} onAction={handleAction} />
      )}

      <div className="relative z-10 mx-auto w-full max-w-3xl shrink-0 px-4 pb-3 pt-3 sm:px-6 sm:pb-5">
        <PromptComposer
          value={prompt}
          onChange={setPrompt}
          onSubmit={send}
          onStop={chat.stop}
          isStreaming={chat.isStreaming}
          agentMode={agentMode}
          onAgentModeChange={setAgentMode}
          modelId={modelId}
          models={models}
          routing={routing}
          onModelChange={setModelId}
          attachments={attachments}
          onAddAttachments={addAttachments}
          onRemoveAttachment={(id) => setAttachments((current) => current.filter((attachment) => attachment.id !== id))}
        />
        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
          {selectedModel?.label ?? "SYNTH model"} · Engine scoped context · provider-neutral
        </p>
      </div>
    </div>
  );
}
