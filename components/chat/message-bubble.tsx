"use client";

import { useMemo } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import { MessageActions } from "@/components/chat/message-actions";

/** Simple code-fence renderer: splits content into text and code blocks */
function renderContent(content: string) {
  const parts: Array<{ type: "text" | "code"; value: string; lang?: string }> = [];
  const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: "code", value: match[2].trimEnd(), lang: match[1] || undefined });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }
  return parts;
}

function MessageContent({ content }: { content: string }) {
  const parts = useMemo(() => renderContent(content), [content]);

  return (
    <div className="text-sm leading-6 text-foreground/85">
      {parts.map((part, i) =>
        part.type === "code" ? (
          <div key={i} className="my-2 overflow-hidden rounded-xl border border-border bg-muted/30">
            {part.lang && (
              <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3 py-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{part.lang}</span>
              </div>
            )}
            <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-foreground/80"><code>{part.value}</code></pre>
          </div>
        ) : (
          <p key={i} className="whitespace-pre-wrap">{part.value}</p>
        )
      )}
    </div>
  );
}

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
          <MessageContent content={message.content} />
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
