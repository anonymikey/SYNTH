"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ChatMessage } from "@/modules/chat/types";
import type { AgentMode } from "@/types/workspace";
import { ConversationStore } from "./store";
import type {
  ConversationSummary,
  StoredConversation,
} from "./types";

interface ConversationState {
  id: string;
  agentMode: AgentMode;
  modelId: string;
  providerId: string;
}

interface ConversationContextValue {
  /** Currently active conversation */
  active: ConversationState | null;
  /** Summary list for sidebar */
  summaries: ConversationSummary[];
  /** Create and activate a new conversation */
  create: (options?: {
    agentMode?: AgentMode;
    modelId?: string;
    providerId?: string;
  }) => string;
  /** Switch to an existing conversation by id */
  select: (id: string) => StoredConversation | null;
  /** Persist updated messages for the active conversation */
  persistMessages: (
    id: string,
    messages: ChatMessage[],
    meta?: { title?: string; agentMode?: AgentMode; modelId?: string; providerId?: string }
  ) => void;
  /** Delete a conversation */
  remove: (id: string) => void;
  /** Rename a conversation */
  rename: (id: string, title: string) => void;
  /** Toggle pin state */
  togglePin: (id: string) => void;
  /** Refresh summaries from storage */
  refresh: () => void;
  /** Reset active conversation (clear messages, keep id) */
  resetActive: () => void;
}

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [active, setActive] = useState<ConversationState | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummary[]>([]);

  // Hydrate summaries from localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    setSummaries(ConversationStore.list());
  }, []);

  const refresh = useCallback(() => {
    setSummaries(ConversationStore.list());
  }, []);

  const create = useCallback(
    (options?: {
      agentMode?: AgentMode;
      modelId?: string;
      providerId?: string;
    }) => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const conversation: StoredConversation = {
        id,
        title: "New conversation",
        messages: [],
        agentMode: options?.agentMode ?? "assistant",
        modelId: options?.modelId ?? "auto",
        providerId: options?.providerId ?? "openrouter",
        pinned: false,
        createdAt: now,
        updatedAt: now,
      };
      ConversationStore.save(conversation);
      setActive({
        id,
        agentMode: conversation.agentMode,
        modelId: conversation.modelId,
        providerId: conversation.providerId,
      });
      refresh();
      return id;
    },
    [refresh]
  );

  const select = useCallback(
    (id: string): StoredConversation | null => {
      const conv = ConversationStore.get(id);
      if (!conv) return null;
      setActive({
        id: conv.id,
        agentMode: conv.agentMode,
        modelId: conv.modelId,
        providerId: conv.providerId,
      });
      return conv;
    },
    []
  );

  const persistMessages = useCallback(
    (
      id: string,
      messages: ChatMessage[],
      meta?: {
        title?: string;
        agentMode?: AgentMode;
        modelId?: string;
        providerId?: string;
      }
    ) => {
      const existing = ConversationStore.get(id);
      const now = new Date().toISOString();
      const conversation: StoredConversation = {
        id,
        title: meta?.title ?? existing?.title ?? generateAutoTitle(messages),
        messages,
        agentMode: meta?.agentMode ?? existing?.agentMode ?? active?.agentMode ?? "assistant",
        modelId: meta?.modelId ?? existing?.modelId ?? active?.modelId ?? "auto",
        providerId: meta?.providerId ?? existing?.providerId ?? active?.providerId ?? "openrouter",
        pinned: existing?.pinned ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      ConversationStore.save(conversation);
      refresh();
    },
    [active, refresh]
  );

  const remove = useCallback(
    (id: string) => {
      ConversationStore.remove(id);
      if (active?.id === id) setActive(null);
      refresh();
    },
    [active, refresh]
  );

  const rename = useCallback(
    (id: string, title: string) => {
      ConversationStore.rename(id, title);
      refresh();
    },
    [refresh]
  );

  const togglePin = useCallback(
    (id: string) => {
      ConversationStore.togglePin(id);
      refresh();
    },
    [refresh]
  );

  const resetActive = useCallback(() => {
    if (active) {
      setActive({
        ...active,
        id: crypto.randomUUID(),
      });
    }
  }, [active]);

  const value = useMemo<ConversationContextValue>(
    () => ({
      active,
      summaries,
      create,
      select,
      persistMessages,
      remove,
      rename,
      togglePin,
      refresh,
      resetActive,
    }),
    [active, summaries, create, select, persistMessages, remove, rename, togglePin, refresh, resetActive]
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error("useConversations must be used within a ConversationProvider");
  }
  return ctx;
}

function generateAutoTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  const text =
    typeof firstUser.content === "string"
      ? firstUser.content
      : String(firstUser.content);
  const trimmed = text.slice(0, 60).trim();
  return trimmed.length < text.length ? `${trimmed}…` : trimmed || "New conversation";
}
