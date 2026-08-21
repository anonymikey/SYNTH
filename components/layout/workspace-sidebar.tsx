"use client";

import { useMemo, useState } from "react";
import { SynthBrand } from "@/components/branding/synth-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger } from "@/components/ui/sidebar";
import { iconFor } from "@/lib/icons";
import { relativeTime } from "@/lib/dates";
import { SYNTH_MODULES, WORKSPACE_AREAS, type ModuleDefinition } from "@/lib/config/modules";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/modules/conversation/types";
import type { WorkspaceArea } from "@/components/workspace/workspace-view-types";

interface WorkspaceSidebarProps {
  activeModule: string;
  onDashboard: () => void;
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
  onDashboard,
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

  const pinnedConversations = useMemo(
    () => visibleHistory.filter((c) => c.pinned),
    [visibleHistory]
  );
  const recentConversations = useMemo(
    () => visibleHistory.filter((c) => !c.pinned),
    [visibleHistory]
  );

  const SearchIcon = iconFor("search");
  const HistoryIcon = iconFor("history");
  const PinIcon = iconFor("mapIcon");
  const MessageIcon = iconFor("messageCircle");
  const DashboardIcon = iconFor("dashboard");

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <SynthBrand className="group-data-[collapsible=icon]:hidden" />
          <div className="hidden group-data-[collapsible=icon]:block"><SynthBrand compact /></div>
          <SidebarTrigger className="text-muted-foreground hover:text-synth-cyan" />
        </div>
      </SidebarHeader>
      <SidebarContent className="custom-scrollbar">
        {/* ── Dashboard + Quick Actions ── */}
        <SidebarGroup className="pb-1">
          <SidebarGroupContent>
            <div className="space-y-1">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    isActive={activeModule === "dashboard"}
                    onClick={onDashboard}
                    tooltip="Dashboard"
                    className="group/dash"
                  >
                    <DashboardIcon className={cn("size-4", activeModule === "dashboard" ? "text-synth-cyan" : "text-muted-foreground")} strokeWidth={1.8} />
                    <span className="font-medium">Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <div className="flex gap-1.5 px-0.5">
                <Button onClick={onNewChat} variant="outline" size="sm" className="h-8 flex-1 justify-start gap-1.5 border-synth-cyan/30 bg-synth-cyan/10 text-foreground hover:border-synth-cyan/50 hover:bg-synth-cyan/15 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                  <span className="flex size-4 items-center justify-center rounded text-synth-cyan text-xs">+</span>
                  <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
                  <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘N</Kbd>
                </Button>
                <Button onClick={onOpenCommand} variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:hidden">
                  <SearchIcon className="size-3.5" />
                  <span className="text-[10px]">⌘K</span>
                </Button>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Modules ── */}
        <SidebarGroup className="pt-0">
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
                      <span>{module.label.replace("SYNTH ", "")}</span>
                    </SidebarMenuButton>
                    {module.status !== "active" && (
                      <SidebarMenuBadge className="bg-synth-violet/10 text-[8px] uppercase text-synth-violet">soon</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Workspace Areas ── */}
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
                    {area.id === "plugins" && <SidebarMenuBadge className="bg-synth-cyan/10 text-[8px] text-synth-cyan">beta</SidebarMenuBadge>}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Conversation History ── */}
        <SidebarGroup className="pt-0 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center justify-between px-2">
            <Button
              variant="ghost"
              className="h-7 min-w-0 justify-start p-0 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setHistoryOpen((open) => !open)}
              aria-expanded={historyOpen}
            >
              Conversations
              {conversations.length > 0 && (
                <span className="ml-1.5 rounded-full bg-muted/50 px-1.5 py-0.5 text-[8px] tabular-nums text-muted-foreground">{conversations.length}</span>
              )}
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
                  placeholder="Search conversations…"
                  aria-label="Search conversations"
                  className="mb-2 h-7 text-xs"
                />
              )}

              {visibleHistory.length === 0 ? (
                <div className="px-2 py-4 text-center">
                  <MessageIcon className="mx-auto mb-2 size-5 text-muted-foreground/30" />
                  {conversations.length === 0 ? (
                    <p className="text-[11px] leading-4 text-muted-foreground/60">No conversations yet.<br />Press <Kbd className="mx-0.5">⌘N</Kbd> to start one.</p>
                  ) : (
                    <p className="text-[11px] leading-4 text-muted-foreground/60">No matches found.</p>
                  )}
                </div>
              ) : (
                <SidebarMenu>
                  {pinnedConversations.length > 0 && (
                    <>
                      <li className="flex items-center gap-1.5 px-2 py-1">
                        <PinIcon className="size-3 text-synth-violet/70" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-synth-violet/70">Pinned</span>
                      </li>
                      {pinnedConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conv={conv}
                          isActive={conv.id === activeConversationId}
                          onSelect={onSelectConversation}
                          onDelete={onDeleteConversation}
                          onPin={onPinConversation}
                        />
                      ))}
                    </>
                  )}

                  {recentConversations.length > 0 && (
                    <>
                      {pinnedConversations.length > 0 && (
                        <li className="mx-2 my-1 h-px bg-border/60" />
                      )}
                      <li className="flex items-center gap-1.5 px-2 py-1">
                        <HistoryIcon className="size-3 text-muted-foreground/40" />
                        <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50">Recent</span>
                      </li>
                      {recentConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conv={conv}
                          isActive={conv.id === activeConversationId}
                          onSelect={onSelectConversation}
                          onDelete={onDeleteConversation}
                          onPin={onPinConversation}
                        />
                      ))}
                    </>
                  )}
                </SidebarMenu>
              )}
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
            <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-muted-foreground">Creator</p>
          </div>
          <Button onClick={onSettings} variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:hidden" aria-label="Open SYNTH settings">
            {(() => { const Icon = iconFor("settings"); return <Icon className="size-4" />; })()}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function ConversationItem({
  conv,
  isActive,
  onSelect,
  onDelete,
  onPin,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
}) {
  const HistoryIcon = iconFor("history");
  return (
    <SidebarMenuItem>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={conv.title}
            size="sm"
            isActive={isActive}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "group/item gap-2 text-left",
              isActive && "bg-synth-cyan/10 text-foreground"
            )}
          >
            <HistoryIcon className={cn("size-3.5 shrink-0", isActive ? "text-synth-cyan" : "text-muted-foreground/40")} />
            <span className="min-w-0 flex-1 truncate text-[11px]">{conv.title}</span>
            <span className="shrink-0 font-mono text-[8px] tabular-nums text-muted-foreground/40 opacity-0 transition-opacity group-hover/item:opacity-100">
              {relativeTime(conv.updatedAt)}
            </span>
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onSelect(conv.id)}>
            Open conversation
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onPin(conv.id)}>
            {conv.pinned ? "Unpin conversation" : "Pin conversation"}
          </ContextMenuItem>
          {conv.messageCount > 0 && (
            <ContextMenuItem disabled className="font-mono text-[10px] text-muted-foreground">
              {conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""}
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onSelect={() => onDelete(conv.id)}>
            Delete conversation
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </SidebarMenuItem>
  );
}
