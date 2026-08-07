import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import { MessageActions } from "@/components/chat/message-actions";

export function MessageBubble({ message, onAction }: { message: ChatMessage; onAction: (message: ChatMessage, action: MessageAction) => void }) {
  const isUser = message.role === "user";
  const CheckIcon = iconFor("checkCircle");
  return (
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[min(84%,48rem)] rounded-2xl border p-4 shadow-sm ${isUser ? "border-synth-violet/30 bg-synth-violet/10" : "border-border bg-card/80"}`}>
        <div className="mb-2 flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.15em]">
          <span className={isUser ? "text-synth-violet" : "text-synth-cyan"}>{isUser ? "You" : "Synth Assistant"}</span>
          <span className="text-muted-foreground/60">/ {isUser ? "prompt" : "local model"}</span>
          {!isUser && message.status === "complete" && <CheckIcon className="ml-auto size-3 text-synth-success" />}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/85">{message.content || (message.status === "pending" ? "Thinking through the active workspace context…" : "")}</p>
        {message.status === "streaming" && <Badge variant="outline" className="mt-3 gap-1 border-synth-cyan/25 bg-synth-cyan/5 font-mono text-[9px] text-synth-cyan"><span className="size-1.5 animate-pulse rounded-full bg-synth-cyan" /> streaming</Badge>}
        {message.status === "error" && <p className="mt-3 text-xs text-destructive">{message.error ?? "The request failed."}</p>}
        {!isUser && message.status === "complete" && <MessageActions onAction={(action) => onAction(message, action)} />}
      </div>
    </article>
  );
}
