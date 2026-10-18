"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import type { SynthRecommendation } from "@/lib/handoff/types";
import { MessageBubble } from "@/components/chat/message-bubble";

export function ChatThread({
  messages,
  onAction,
  onRecommendationAction,
}: {
  messages: ChatMessage[];
  onAction: (message: ChatMessage, action: MessageAction) => void;
  onRecommendationAction?: (recommendation: SynthRecommendation) => void;
}) {
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldFollowRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const lastMessage = messages[messages.length - 1];
  const isStreaming = lastMessage?.status === "streaming" || lastMessage?.status === "pending";

  const scrollToLatest = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }, []);

  useEffect(() => {
    const viewport = threadRef.current?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    if (!viewport) return;

    const updateScrollState = () => {
      const distanceFromBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
      const isNearBottom = distanceFromBottom <= 72;
      shouldFollowRef.current = isNearBottom;
      setShowJumpToLatest(!isNearBottom && viewport.scrollHeight > viewport.clientHeight);
    };

    viewport.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
    return () => viewport.removeEventListener("scroll", updateScrollState);
  }, []);

  // Follow new content only while the reader is already near the latest message.
  useEffect(() => {
    if (shouldFollowRef.current) {
      scrollToLatest(isStreaming ? "auto" : "smooth");
    }
  }, [messages.length, lastMessage?.content, isStreaming, scrollToLatest]);

  return (
    <div ref={threadRef} className="relative min-h-0 flex-1">
      <ScrollArea className="h-full" aria-live="polite" aria-label="SYNTH Assistant conversation">
        <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 pb-6 pt-4 sm:gap-4 sm:px-6" aria-label="Conversation messages">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            onAction={onAction}
            onRecommendationAction={onRecommendationAction}
          />
        ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
      {showJumpToLatest && (
        <button
          type="button"
          onClick={() => {
            shouldFollowRef.current = true;
            scrollToLatest();
          }}
          aria-label="Jump to latest message"
          title="Jump to latest message"
          className="absolute bottom-3 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-synth-cyan shadow-lg backdrop-blur-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:bottom-4"
        >
          <ArrowDown aria-hidden="true" />
          <span className="sr-only">Jump to latest message</span>
        </button>
      )}
    </div>
  );
}
