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
      return "text-white/40";
    case "html":
      return "text-orange-400";
    default:
      return "text-white/30";
  }
}

export function CodeTabs({ tabs, activePath, onSelect, onClose }: CodeTabsProps) {
  const XIcon = iconFor("x");

  if (tabs.length === 0) {
    return (
      <div className="flex h-7 shrink-0 items-center border-b border-white/[.06] px-3 bg-[#11151d]">
        <span className="text-[9px] text-white/20">No files open</span>
      </div>
    );
  }

  return (
    <div className="flex h-7 shrink-0 items-center gap-0 overflow-x-auto border-b border-white/[.06] bg-[#11151d] scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.path === activePath;
        const ext = tab.path.split(".").pop() ?? "";
        const fileName = tab.label;

        return (
          <div
            key={tab.path}
            className={`group flex h-full shrink-0 items-center gap-1 border-r border-white/[.04] px-2.5 text-[10px] ${
              isActive
                ? "bg-[#1a1d28] text-white/80"
                : "text-white/30 hover:bg-white/[0.02] hover:text-white/50"
            }`}
          >
            <button
              type="button"
              className="flex items-center gap-1"
              onClick={() => onSelect(tab.path)}
            >
              <span className={`font-mono text-[7px] ${extensionColor(ext)}`}>●</span>
              <span className="max-w-[100px] truncate">{fileName}</span>
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="ml-0.5 rounded-sm p-0.5 opacity-0 hover:bg-white/[0.05] group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.path);
                  }}
                  aria-label={`Close ${fileName}`}
                >
                  <XIcon className="size-2 text-white/25" />
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
