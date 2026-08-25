"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CodeDraft {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

interface CodeSidebarProps {
  project: ProjectInfo | null;
  drafts: CodeDraft[];
  activeDraftId: string | null;
  onSelectDraft: (id: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onOpenFiles: () => void;
  isIDEActive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Navigation items                                                   */
/* ------------------------------------------------------------------ */

interface NavItem {
  id: string;
  label: string;
  icon: string;
  shortcut?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "search", label: "Search", icon: "search", shortcut: "⌘K" },
  { id: "files", label: "Files", icon: "files", shortcut: "⌘E" },
  { id: "forge", label: "Forge", icon: "sparkles" },
  { id: "recent", label: "Recent", icon: "history" },
];

/* ------------------------------------------------------------------ */
/*  Draft row                                                          */
/* ------------------------------------------------------------------ */

function DraftRow({
  draft,
  isActive,
  onSelect,
}: {
  draft: CodeDraft;
  isActive: boolean;
  onSelect: () => void;
}) {
  const timeAgo = formatTimeAgo(draft.timestamp);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors",
        isActive
          ? "bg-synth-cyan/10 text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
      onClick={onSelect}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" />
      <span className="min-w-0 flex-1 truncate text-[11px]">{draft.title}</span>
      {timeAgo && (
        <span className="shrink-0 text-[9px] text-muted-foreground/40">{timeAgo}</span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar component                                                  */
/* ------------------------------------------------------------------ */

export function CodeSidebar({
  project,
  drafts,
  activeDraftId,
  onSelectDraft,
  onNewChat,
  isOpen,
  onToggle,
  onOpenFiles,
  isIDEActive,
}: CodeSidebarProps) {
  const [activeNav, setActiveNav] = useState<string | null>(null);

  const handleNavClick = useCallback(
    (id: string) => {
      setActiveNav(id);
      if (id === "files") onOpenFiles();
    },
    [onOpenFiles],
  );

  const ChevronIcon = iconFor("chevronDown");
  const PlusIcon = iconFor("plus");

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border/60 bg-background/95 backdrop-blur-xl",
          "transition-all duration-200 ease-out",
          /* Desktop: fixed width, always visible when open */
          "lg:relative lg:z-auto",
          isOpen
            ? "w-64 min-w-0 opacity-100"
            : "w-0 min-w-0 overflow-hidden opacity-0 lg:w-0",
          /* Mobile: absolute overlay */
          "fixed inset-y-0 left-0 z-50 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* Workspace header */}
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3">
          <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-synth-cyan/15">
            <img
              src="/synth-logo.png"
              alt=""
              className="size-full object-cover"
              width={24}
              height={24}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-[11px] font-semibold text-foreground">
                {project?.name ?? "SYNTH"}
              </span>
              <ChevronIcon className="size-3 text-muted-foreground/50" />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground hover:text-foreground lg:hidden"
            onClick={onToggle}
          >
            {iconFor("x")({ className: "size-3.5" })}
          </Button>
        </div>

        {/* New Chat button */}
        <div className="px-2 pt-2 pb-1">
          <Button
            type="button"
            variant="outline"
            className="w-full h-8 gap-2 border-border/60 bg-transparent text-[11px] font-medium text-foreground hover:bg-white/[0.04]"
            onClick={onNewChat}
          >
            <PlusIcon className="size-3.5" />
            New Chat
          </Button>
        </div>

        {/* Navigation */}
        <nav className="px-2 py-1">
          {NAV_ITEMS.map((item) => {
            const NavIcon = iconFor(item.icon);
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left transition-colors",
                  isActive
                    ? "bg-white/[0.06] text-foreground"
                    : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                )}
                onClick={() => handleNavClick(item.id)}
              >
                <NavIcon className="size-3.5 shrink-0" />
                <span className="text-[11px]">{item.label}</span>
                {item.shortcut && (
                  <span className="ml-auto font-mono text-[9px] text-muted-foreground/40">
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <Separator className="mx-2 bg-border/40" />

        {/* Drafts */}
        <div className="px-3 pt-2 pb-1">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/50">
            Drafts
          </span>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-0.5 pb-4">
            {drafts.length === 0 && (
              <p className="px-3 py-4 text-center text-[10px] text-muted-foreground/40">
                No conversations yet
              </p>
            )}
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                draft={draft}
                isActive={draft.id === activeDraftId}
                onSelect={() => onSelectDraft(draft.id)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Footer — project status */}
        <div className="shrink-0 border-t border-border/40 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-synth-success/70" />
            <span className="text-[9px] text-muted-foreground/60">
              {isIDEActive ? "WORKSPACE ACTIVE" : "WORKSPACE READY"}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[8px] text-muted-foreground/40">
            {project?.language && <span>{project.language}</span>}
            {project?.version && (
              <>
                <span>·</span>
                <span>{project.version}</span>
              </>
            )}
            {project?.adapterType && (
              <>
                <span>·</span>
                <span className="uppercase">{project.adapterType}</span>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return "";
}
