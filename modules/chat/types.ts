import type { MessageRole } from "@/lib/ai/types";

export type ChatMessageStatus = "pending" | "streaming" | "complete" | "error";
export type MessageAction = "copy" | "edit" | "regenerate" | "like" | "dislike" | "share";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  error?: string;
}

export interface ChatThread {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
