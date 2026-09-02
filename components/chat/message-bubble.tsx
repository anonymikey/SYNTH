"use client";

import { ThinkingOrb } from "thinking-orbs";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import { MessageActions } from "@/components/chat/message-actions";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export function MessageBubble({ message, onAction }: { message: ChatMessage; onAction: (message: ChatMessage, action: MessageAction) => void }) {
  const isUser = message.role === "user";
  const CheckIcon = iconFor("checkCircle");

  return (
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[min(82%,48rem)] rounded-2xl border p-4 shadow-sm transition-colors ${
          isUser
            ? "border-synth-violet/25 bg-synth-violet/8"
            : "border-border bg-card/70"
        }`}
      >
        {/* Role label */}
        <div className="mb-2 flex items-center gap-2">
          <span className={`font-mono text-[9px] font-semibold uppercase tracking-[0.15em] ${isUser ? "text-synth-violet" : "text-synth-cyan"}`}>
            {isUser ? "You" : "SYNTH"}
          </span>
          {!isUser && message.status === "complete" && (
            <CheckIcon className="size-3 text-synth-success" />
          )}
          {!isUser && message.status === "streaming" && (
            <div className="flex items-center gap-1.5">
              <ThinkingOrb state="weaving" size={20} theme="dark" />
              <Badge variant="outline" className="border-synth-cyan/25 bg-synth-cyan/5 px-1.5 py-0 font-mono text-[8px] text-synth-cyan">
                streaming
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        {message.content ? (
          <MarkdownRenderer content={message.content} variant="assistant" />
        ) : message.status === "pending" ? (
          <div className="flex items-center gap-3 py-1">
            <ThinkingOrb state="working" size={20} theme="dark" />
            <span className="text-sm text-muted-foreground/70">Thinking…</span>
          </div>
        ) : null}

        {/* Approval required */}
        {message.approvalRequired && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-synth-violet/25 bg-synth-violet/5 px-3 py-2 text-xs text-synth-violet">
            <span className="size-1.5 rounded-full bg-synth-violet" />
            Approval required before tool execution
          </div>
        )}

        {/* Error */}
        {message.status === "error" && (
          <p className="mt-2 text-xs text-destructive">{message.error ?? "The request failed."}</p>
        )}

        {/* Actions (assistant only, after completion) */}
        {!isUser && message.status === "complete" && (
          <MessageActions onAction={(action) => onAction(message, action)} />
        )}
      </div>
    </article>
  );
}
