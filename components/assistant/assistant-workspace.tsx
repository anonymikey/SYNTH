"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChatThread } from "@/components/chat/chat-thread";
import { PromptComposer, type ComposerAttachment, type PromptComposerHandle } from "@/components/assistant/prompt-composer";
import { SuggestionGrid } from "@/components/assistant/suggestion-grid";
import { WelcomeState } from "@/components/assistant/welcome-state";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEFAULT_CONTEXT } from "@/lib/config/workspace";
import { useModelCatalog } from "@/modules/models/hooks/use-model-catalog";
import { SUGGESTED_PROMPTS } from "@/modules/assistant/constants";
import { useAssistantChat } from "@/modules/assistant/hooks/use-assistant-chat";
import { useConversations } from "@/modules/conversation/conversation-provider";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import type { AgentMode, ProjectSummary } from "@/types/workspace";
import { useShortcuts } from "@/lib/shortcuts/use-shortcut";
import { iconFor } from "@/lib/icons";

interface AssistantWorkspaceProps {
  project: ProjectSummary;
  conversationId?: string;
  composerRef?: React.RefObject<PromptComposerHandle | null>;
}

export function AssistantWorkspace({ project, conversationId, composerRef }: AssistantWorkspaceProps) {
  const conversations = useConversations();
  const { models, routing } = useModelCatalog();
  const [prompt, setPrompt] = useState("");
  const [agentMode, setAgentMode] = useState<AgentMode>("assistant");
  const [modelId, setModelId] = useState("auto");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const localComposerRef = useRef<PromptComposerHandle>(null);
  const activeComposerRef = composerRef ?? localComposerRef;

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

  // Message action shortcuts (only when not typing in input)
  useShortcuts([
    {
      key: "c",
      handler: async () => {
        const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.status === "complete");
        if (lastAssistant?.content) {
          await navigator.clipboard?.writeText(lastAssistant.content);
          toast.success("Response copied");
        }
      },
    },
    {
      key: "r",
      handler: async () => {
        const lastAssistant = [...chat.messages].reverse().find((m) => m.role === "assistant" && m.status === "complete");
        if (lastAssistant?.content && !chat.isStreaming) {
          await chat.sendPrompt(lastAssistant.content);
        }
      },
    },
  ]);

  const FullscreenIcon = iconFor("maximize");
  const SettingsIcon = iconFor("settings");

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Background effects */}
      <div className="synth-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-[70%] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--synth-cyan)_8%,transparent),transparent_70%)]" />

      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-border/40 px-6 py-3">
        <div>
          <h1 className="font-heading text-lg font-semibold text-foreground">
            AI Chatbot
          </h1>
          <p className="text-xs text-muted-foreground">
            Ask anything about your code, research, planning, and creativity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                <FullscreenIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Fullscreen</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
                <SettingsIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Options</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Main content area */}
      {showWelcome ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Center content: orb + title */}
          <WelcomeState />

          {/* Bottom section: composer + suggestions */}
          <div className="relative z-10 mx-auto w-full max-w-3xl shrink-0 px-4 pb-4 sm:px-6">
            {/* Suggestions below composer */}
            <div className="mb-4">
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

            {/* Composer */}
            <PromptComposer
              ref={activeComposerRef}
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
          </div>
        </div>
      ) : (
        <>
          <ChatThread messages={chat.messages} onAction={handleAction} />

          {/* Bottom composer (when conversation active) */}
          <div className="relative z-10 mx-auto w-full max-w-3xl shrink-0 px-4 pb-3 pt-3 sm:px-6 sm:pb-5">
            <PromptComposer
              ref={activeComposerRef}
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
          </div>
        </>
      )}
    </div>
  );
}
