"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";

export interface Tab {
  path: string;
  label: string;
}

interface CodeTabsProps {
  tabs: Tab[];
  activePath: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function extensionColor(ext: string): string {
  switch (ext) {
    case "tsx":
    case "ts":
      return "text-blue-400";
    case "jsx":
    case "js":
      return "text-yellow-400";
    case "css":
    case "scss":
      return "text-pink-400";
    case "json":
      return "text-green-400";
    case "md":
      return "text-muted-foreground";
    case "html":
      return "text-orange-400";
    default:
      return "text-muted-foreground/60";
  }
}

export function CodeTabs({ tabs, activePath, onSelect, onClose }: CodeTabsProps) {
  const XIcon = iconFor("x");

  if (tabs.length === 0) {
    return (
      <div className="flex h-8 shrink-0 items-center border-b border-border/40 px-3">
        <span className="text-[10px] text-muted-foreground/50">No files open</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 shrink-0 items-center gap-0 overflow-x-auto border-b border-border/40 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const ext = tab.path.split(".").pop() ?? "";
        const fileName = tab.label;

        return (
          <div
            key={tab.path}
            className={`group flex h-full shrink-0 items-center gap-1.5 border-r border-border/30 px-3 text-[11px] ${
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
            }`}
          >
            <button
              type="button"
              className="flex items-center gap-1.5"
              onClick={() => onSelect(tab.path)}
            >
              <span className={`font-mono text-[9px] ${extensionColor(ext)}`}>●</span>
              <span className="max-w-[120px] truncate">{fileName}</span>
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-0.5 rounded-sm p-0.5 opacity-0 hover:bg-muted group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.path);
                  }}
                  aria-label={`Close ${fileName}`}
                >
                  <XIcon className="size-2.5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Close tab</TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
}
