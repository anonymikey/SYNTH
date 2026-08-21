import type { ChatMessage } from "@/modules/chat/types";

export interface ChatState {
  messages: ChatMessage[];
  activeRequestId?: string;
  isStreaming: boolean;
}

export type ChatAction =
  | { type: "reset" }
  | { type: "hydrate"; messages: ChatMessage[] }
  | { type: "user-message"; message: ChatMessage; requestId: string }
  | { type: "assistant-start"; message: ChatMessage }
  | { type: "assistant-delta"; messageId: string; delta: string }
  | { type: "completed"; messageId: string }
  | { type: "approval-required"; messageId: string }
  | { type: "failed"; messageId: string; error: string };

export const initialChatState: ChatState = { messages: [], isStreaming: false };

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "reset":
      return initialChatState;
    case "hydrate":
      return { ...state, messages: action.messages, isStreaming: false };
    case "user-message":
      return { ...state, messages: [...state.messages, action.message], activeRequestId: action.requestId, isStreaming: true };
    case "assistant-start":
      return { ...state, messages: [...state.messages, action.message], isStreaming: true };
    case "assistant-delta":
      return { ...state, messages: state.messages.map((message) => message.id === action.messageId ? { ...message, content: message.content + action.delta, status: "streaming" } : message) };
    case "completed":
      return { ...state, messages: state.messages.map((message) => message.id === action.messageId ? { ...message, status: "complete" } : message), activeRequestId: undefined, isStreaming: false };
    case "approval-required":
      return { ...state, messages: state.messages.map((message) => message.id === action.messageId ? { ...message, status: "complete", approvalRequired: true } : message), activeRequestId: undefined, isStreaming: false };
    case "failed":
      return { ...state, messages: state.messages.map((message) => message.id === action.messageId ? { ...message, status: "error", error: action.error } : message), activeRequestId: undefined, isStreaming: false };
    default:
      return state;
  }
}
