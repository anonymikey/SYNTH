import { Button } from "@/components/ui/button";
import { iconFor } from "@/lib/icons";
import type { MessageAction } from "@/modules/chat/types";

const actions: Array<{ id: MessageAction; label: string; icon: string }> = [
  { id: "copy", label: "Copy response", icon: "copy" },
  { id: "edit", label: "Edit message", icon: "pencil" },
  { id: "regenerate", label: "Regenerate response", icon: "refresh" },
  { id: "like", label: "Like response", icon: "thumbsUp" },
  { id: "dislike", label: "Dislike response", icon: "thumbsDown" },
  { id: "share", label: "Share response", icon: "share" },
];

export function MessageActions({ onAction }: { onAction: (action: MessageAction) => void }) {
  return (
    <div className="mt-3 flex items-center gap-0.5 border-t border-border/70 pt-2">
      {actions.map((action) => { const Icon = iconFor(action.icon); return <Button key={action.id} variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground" aria-label={action.label} onClick={() => onAction(action.id)}><Icon className="size-3.5" /></Button>; })}
    </div>
  );
}
