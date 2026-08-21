"use client";

import { useMemo, useState } from "react";
import { SynthBrand } from "@/components/branding/synth-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { iconFor } from "@/lib/icons";
import { SYNTH_MODULES, WORKSPACE_AREAS, type ModuleDefinition } from "@/lib/config/modules";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/modules/conversation/types";
import type { WorkspaceArea } from "@/components/workspace/workspace-view-types";

interface WorkspaceSidebarProps {
  activeModule: string;
  onSelectModule: (module: ModuleDefinition) => void;
  onSelectArea: (area: WorkspaceArea) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onOpenCommand: () => void;
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onPinConversation: (id: string) => void;
}

export function WorkspaceSidebar({
  activeModule,
  onSelectModule,
  onSelectArea,
  onNewChat,
  onSettings,
  onOpenCommand,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onPinConversation,
}: WorkspaceSidebarProps) {
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const visibleHistory = useMemo(() => {
    if (!historyQuery.trim()) return conversations;
    const q = historyQuery.toLowerCase();
    return conversations.filter(
      (conv) =>
        conv.title.toLowerCase().includes(q) ||
        conv.lastMessage.toLowerCase().includes(q)
    );
  }, [conversations, historyQuery]);
  const SearchIcon = iconFor("search");
  const MoreIcon = iconFor("more");
  const HistoryIcon = iconFor("history");

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-16 border-b border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2">
          <SynthBrand className="group-data-[collapsible=icon]:hidden" />
          <div className="hidden group-data-[collapsible=icon]:block"><SynthBrand compact /></div>
          <SidebarTrigger className="text-muted-foreground hover:text-synth-cyan" />
        </div>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar">
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <div className="space-y-2">
              <Button onClick={onNewChat} variant="outline" className="h-10 w-full justify-start border-synth-cyan/30 bg-synth-cyan/10 text-foreground hover:border-synth-cyan/50 hover:bg-synth-cyan/15 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center">
                <span className="flex size-5 items-center justify-center rounded-md text-synth-cyan"><span className="text-lg leading-none">+</span></span>
                <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
                <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘ N</Kbd>
              </Button>
              <Button onClick={onOpenCommand} variant="ghost" className="h-8 w-full justify-start text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <SearchIcon className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">Command palette</span>
                <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘ K</Kbd>
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SYNTH_MODULES.map((module) => {
                const Icon = iconFor(module.icon);
                return (
                  <SidebarMenuItem key={module.id}>
                    <SidebarMenuButton
                      isActive={activeModule === module.id}
                      tooltip={module.label}
                      onClick={() => onSelectModule(module)}
                      className={cn(module.status !== "active" && "text-muted-foreground/70")}
                    >
                      <Icon className={cn("size-4", module.id === "assistant" ? "text-synth-cyan" : module.id === "vision" ? "text-synth-violet" : "text-muted-foreground")} strokeWidth={1.8} />
                      <span>{module.label}</span>
                    </SidebarMenuButton>
                    {module.status !== "active" && (
                      <SidebarMenuBadge className="bg-synth-violet/10 text-[9px] uppercase text-synth-violet">preview</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0">
          <SidebarGroupLabel className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {WORKSPACE_AREAS.map((area) => {
                const Icon = iconFor(area.icon);
                return (
                  <SidebarMenuItem key={area.id}>
                    <SidebarMenuButton isActive={activeModule === area.id} tooltip={area.label} onClick={() => onSelectArea(area.id)}>
                      <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
                      <span>{area.label}</span>
                    </SidebarMenuButton>
                    {area.id === "projects" && <SidebarMenuBadge>{String(conversations.length).padStart(2, "0")}</SidebarMenuBadge>}
                    {area.id === "plugins" && <SidebarMenuBadge className="bg-synth-cyan/10 text-[9px] text-synth-cyan">beta</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-0 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between px-2">
            <Button
              variant="ghost"
              className="h-8 min-w-0 justify-start p-0 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              Recent conversations
            </Button>
            <div className="flex items-center">
              <Button variant="ghost" size="icon-xs" onClick={() => setHistorySearchOpen((open) => !open)} aria-label="Search conversation history">
                <SearchIcon className="size-3.5" />
              </Button>
            </div>
          </div>
          {historyOpen && (
            <SidebarGroupContent className="mt-1">
              {historySearchOpen && (
                <Input
                  value={historyQuery}
                  onChange={(event) => setHistoryQuery(event.target.value)}
                  placeholder="Search history..."
                  aria-label="Search history"
                  className="mb-2 h-8 text-xs"
                />
              )}
              <SidebarMenu>
                {visibleHistory.length > 0 ? (
                  visibleHistory.map((conv) => (
                    <SidebarMenuItem key={conv.id}>
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <SidebarMenuButton
                            tooltip={conv.title}
                            size="sm"
                            isActive={conv.id === activeConversationId}
                            onClick={() => onSelectConversation(conv.id)}
                            className={cn(
                              "text-left",
                              conv.id === activeConversationId && "bg-synth-cyan/10 text-foreground"
                            )}
                          >
                            <HistoryIcon className={cn("size-3.5", conv.id === activeConversationId ? "text-synth-cyan" : "text-muted-foreground/50")} />
                            <span className="truncate">{conv.title}</span>
                          </SidebarMenuButton>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onSelect={() => onPinConversation(conv.id)}>
                            {conv.pinned ? "Unpin conversation" : "Pin conversation"}
                          </ContextMenuItem>
                          <ContextMenuItem onSelect={() => onSelectConversation(conv.id)}>
                            Open conversation
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem variant="destructive" onSelect={() => onDeleteConversation(conv.id)}>
                            Delete conversation
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </SidebarMenuItem>
                  ))
                ) : (
                  <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet. Start a new chat!</p>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-synth-cyan/35 bg-synth-cyan/10 font-mono text-[10px] font-semibold text-synth-cyan">AM</div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[11px] font-semibold">ANONYMIKE</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Creator profile</p>
          </div>
          <Button onClick={onSettings} variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:hidden" aria-label="Open SYNTH settings">
            {(() => { const Icon = iconFor("settings"); return <Icon className="size-4" />; })()}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
