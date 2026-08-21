"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";
import type { MessageAction } from "@/modules/chat/types";

const actions: Array<{ id: MessageAction; label: string; icon: string }> = [
  { id: "copy", label: "Copy", icon: "copy" },
  { id: "regenerate", label: "Regenerate", icon: "refresh" },
  { id: "like", label: "Helpful", icon: "thumbsUp" },
  { id: "share", label: "Share", icon: "share" },
];

export function MessageActions({ onAction }: { onAction: (action: MessageAction) => void }) {
  return (
    <div className="mt-2 flex items-center gap-0.5 border-t border-border/60 pt-2">
      {actions.map((action) => {
        const Icon = iconFor(action.icon);
        return (
          <Tooltip key={action.id}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground/60 hover:text-foreground"
                aria-label={action.label}
                onClick={() => onAction(action.id)}
              >
                <Icon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{action.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
