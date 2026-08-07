import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage, MessageAction } from "@/modules/chat/types";
import { MessageBubble } from "@/components/chat/message-bubble";

export function ChatThread({ messages, onAction }: { messages: ChatMessage[]; onAction: (message: ChatMessage, action: MessageAction) => void }) {
  return (
    <ScrollArea className="min-h-0 flex-1" aria-live="polite" aria-label="SYNTH Assistant conversation">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-6 pt-4 sm:px-6" aria-label="Conversation messages">
        {messages.map((message) => <MessageBubble key={message.id} message={message} onAction={onAction} />)}
      </div>
    </ScrollArea>
  );
}
