"use client";

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import { MessageBubble } from "@/components/chat/message-bubble";

export function ChatThread({ messages, onAction }: { messages: ChatMessage[]; onAction: (message: ChatMessage, action: MessageAction) => void }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage?.status === "streaming" || lastMessage?.status === "pending";

  // Auto-scroll to bottom when new messages arrive or during streaming
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: isStreaming ? "auto" : "smooth" });
    }
  }, [messages.length, lastMessage?.content, isStreaming]);

  return (
    <ScrollArea className="min-h-0 flex-1" aria-live="polite" aria-label="SYNTH Assistant conversation">
      <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 pb-6 pt-4 sm:gap-4 sm:px-6" aria-label="Conversation messages">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} onAction={onAction} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
