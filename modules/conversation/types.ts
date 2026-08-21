import type { AgentMode } from "@/types/workspace";
import type { ChatMessage } from "@/modules/chat/types";

export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  agentMode: AgentMode;
  modelId: string;
  providerId: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  pinned: boolean;
  messageCount: number;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}
