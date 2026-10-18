"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import type { SynthRecommendation } from "@/lib/handoff/types";
import { MessageBubble } from "@/components/chat/message-bubble";

/** Within this distance of the bottom the thread re-attaches and follows new content. */
const RESTICK_PX = 24;
/** Scrolling further up than this shows the "go down" arrow… */
const SHOW_BUTTON_PX = 160;
/** …and it hides again once the reader is back within this distance. */
const HIDE_BUTTON_PX = 80;

export function ChatThread({
  messages,
  onAction,
  onRecommendationAction,
}: {
  messages: ChatMessage[];
  onAction: (message: ChatMessage, action: MessageAction) => void;
  onRecommendationAction?: (recommendation: SynthRecommendation) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // true = auto-follow the newest content
  const lastTopRef = useRef(0);
  const lastHeightRef = useRef(0);
  const prevCountRef = useRef(0);
  const [showJump, setShowJump] = useState(false);
  const [hasNew, setHasNew] = useState(false);

  const updateState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;

    // The reader moved up by themselves -> stop auto-following immediately.
    if (el.scrollTop < lastTopRef.current - 1 && dist > RESTICK_PX) stickRef.current = false;
    lastTopRef.current = el.scrollTop;

    if (dist <= RESTICK_PX) {
      stickRef.current = true;
      setHasNew(false);
    }
    // Hysteresis avoids the arrow flickering around the threshold.
    setShowJump((visible) => (visible ? dist > HIDE_BUTTON_PX : dist > SHOW_BUTTON_PX));
  }, []);

  const jumpToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollerRef.current;
    if (!el) return;
    stickRef.current = true;
    setHasNew(false);
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;

    // Any upward gesture detaches auto-follow right away, so streaming
    // text can never yank the page back down while someone is reading.
    const onWheel = (e: WheelEvent) => { if (e.deltaY < 0) stickRef.current = false; };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0;
      if (y > touchY + 2) stickRef.current = false; // finger moving down = content scrolling up
      touchY = y;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") stickRef.current = false;
    };

    // Content growth (streaming, images, markdown) and viewport changes
    // (mobile keyboard, rotation, address-bar collapse) all land here.
    const observer = new ResizeObserver(() => {
      if (stickRef.current) {
        scroller.scrollTop = scroller.scrollHeight;
      } else if (scroller.scrollHeight > lastHeightRef.current) {
        setHasNew(true);
      }
      lastHeightRef.current = scroller.scrollHeight;
      updateState();
    });
    observer.observe(content);
    observer.observe(scroller);

    scroller.addEventListener("scroll", updateState, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: true });
    scroller.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      scroller.removeEventListener("scroll", updateState);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("keydown", onKey);
    };
  }, [updateState]);

  // Sending a message always takes the reader back to the latest content.
  useEffect(() => {
    const added = messages.slice(prevCountRef.current);
    if (prevCountRef.current > 0 && added.some((m) => m.role === "user")) jumpToBottom("auto");
    prevCountRef.current = messages.length;
  }, [messages, jumpToBottom]);

  return (
    <div className="relative min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
      <div
        ref={scrollerRef}
        role="log"
        aria-label="SYNTH Assistant conversation"
        tabIndex={0}
        className="h-full min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-contain outline-none [-webkit-overflow-scrolling:touch] [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
      >
        <div
          ref={contentRef}
          className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-3 px-3 pb-6 pt-4 sm:gap-4 sm:px-6"
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onAction={onAction}
              onRecommendationAction={onRecommendationAction}
            />
          ))}
        </div>
      </div>

      {/* Go-down arrow: always mounted so it can fade, but unreachable while hidden. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center sm:bottom-4">
        <button
          type="button"
          onClick={() => jumpToBottom("smooth")}
          tabIndex={showJump ? 0 : -1}
          aria-hidden={!showJump}
          aria-label={hasNew ? "Jump to latest message (new content)" : "Jump to latest message"}
          title="Jump to latest"
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full border border-border bg-card/95 text-synth-cyan shadow-lg backdrop-blur-sm transition duration-200 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:size-9",
            showJump ? "pointer-events-auto translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          <ArrowDown className="size-4" aria-hidden="true" />
          {hasNew && (
            <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-card bg-synth-cyan" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
