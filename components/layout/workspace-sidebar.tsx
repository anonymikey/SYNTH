"use client";

import { useMemo, useState } from "react";
import { Pin, X } from "lucide-react";
import { SynthBrand } from "@/components/branding/synth-brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarSeparator, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { iconFor } from "@/lib/icons";
import { relativeTime } from "@/lib/dates";
import { SYNTH_MODULES, WORKSPACE_AREAS, type ModuleDefinition } from "@/lib/config/modules";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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
  onOpenContext?: () => void;
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
  onOpenContext,
  conversations,
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onPinConversation,
}: WorkspaceSidebarProps) {
  const { setOpenMobile, isMobile, toggleSidebar, isPinned, setIsPinned } = useSidebar();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");

  const handleOpenContext = () => {
    if (isMobile) setOpenMobile(false);
    onOpenContext?.();
  };

  const handleDashboard = () => {
    if (isMobile) setOpenMobile(false);
    onDashboard();
  };

  const handleSelectModule = (mod: ModuleDefinition) => {
    if (isMobile) setOpenMobile(false);
    onSelectModule(mod);
  };

  const handleSelectArea = (area: WorkspaceArea) => {
    if (isMobile) setOpenMobile(false);
    onSelectArea(area);
  };

  const handleNewChat = () => {
    if (isMobile) setOpenMobile(false);
    onNewChat();
  };

  const handleSettings = () => {
    if (isMobile) setOpenMobile(false);
    onSettings();
  };

  const handleOpenCommand = () => {
    if (isMobile) setOpenMobile(false);
    onOpenCommand();
  };

  const handleSelectConversation = (id: string) => {
    if (isMobile) setOpenMobile(false);
    onSelectConversation(id);
  };

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
  const PanelIcon = iconFor("panelRight");

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border bg-sidebar">
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3 py-2">
        {/* Expanded state header */}
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
          <SynthBrand />
          <div className="flex items-center gap-1">
            {!isMobile && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={cn(
                      "size-7 rounded-md transition-colors",
                      isPinned ? "text-synth-cyan bg-synth-cyan/15 hover:bg-synth-cyan/25" : "text-muted-foreground hover:text-synth-cyan"
                    )}
                    onClick={() => {
                      setIsPinned(!isPinned);
                      toast.info(!isPinned ? "Sidebar pinned open" : "Sidebar unpinned (auto-hides on leave)");
                    }}
                    aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                  >
                    <Pin className={cn("size-3.5 transition-transform", isPinned && "rotate-45 fill-current")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isPinned ? "Pinned open (click to unpin)" : "Pin open (prevents auto-hide)"}
                </TooltipContent>
              </Tooltip>
            )}
            {isMobile ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setOpenMobile(false)}
                aria-label="Close navigation"
              >
                <X className="size-4" />
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="size-7 text-muted-foreground hover:text-synth-cyan" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Collapse sidebar (⌘B)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Collapsed icon-rail state header: centered brand toggle button */}
        <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="size-9 rounded-xl p-0 hover:bg-synth-cyan/15 hover:ring-1 hover:ring-synth-cyan/40 active:scale-95 transition-all"
                onClick={toggleSidebar}
                aria-label="Open sidebar"
              >
                <SynthBrand compact />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Open sidebar (⌘B)</TooltipContent>
          </Tooltip>
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
                    onClick={handleDashboard}
                    tooltip="Dashboard"
                    className="group/dash"
                  >
                    <DashboardIcon className={cn("size-4", activeModule === "dashboard" ? "text-synth-cyan" : "text-muted-foreground")} strokeWidth={1.8} />
                    <span className="font-medium">Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              <div className="flex gap-1.5 px-0.5">
                <Button onClick={handleNewChat} variant="outline" size="sm" className="h-8 flex-1 justify-start gap-1.5 border-synth-cyan/30 bg-synth-cyan/10 text-foreground hover:border-synth-cyan/50 hover:bg-synth-cyan/15 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                  <span className="flex size-4 items-center justify-center rounded text-synth-cyan text-xs">+</span>
                  <span className="group-data-[collapsible=icon]:hidden">New Chat</span>
                  <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘N</Kbd>
                </Button>
                {onOpenContext && (
                  <Button onClick={handleOpenContext} variant="outline" size="sm" className="h-8 gap-1.5 border-synth-cyan/30 bg-synth-cyan/5 px-2 text-synth-cyan hover:border-synth-cyan/60 hover:bg-synth-cyan/15 group-data-[collapsible=icon]:hidden" title="SYNTH Context">
                    <PanelIcon className="size-3.5 text-synth-cyan" />
                    <span className="text-[10px] font-medium">Context</span>
                  </Button>
                )}
                <Button onClick={handleOpenCommand} variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:hidden">
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
                      onClick={() => handleSelectModule(module)}
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
              {onOpenContext && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip="SYNTH Context"
                    onClick={handleOpenContext}
                    className="group/ctx hover:bg-synth-cyan/10"
                  >
                    <PanelIcon className="size-4 text-synth-cyan" strokeWidth={1.8} />
                    <span className="font-medium text-foreground">SYNTH Context</span>
                    <SidebarMenuBadge className="bg-synth-cyan/15 font-mono text-[8px] text-synth-cyan">panel</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {WORKSPACE_AREAS.map((area) => {
                const Icon = iconFor(area.icon);
                return (
                  <SidebarMenuItem key={area.id}>
                    <SidebarMenuButton isActive={activeModule === area.id} tooltip={area.label} onClick={() => handleSelectArea(area.id)}>
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
                          onSelect={handleSelectConversation}
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
                          onSelect={handleSelectConversation}
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
          <Button onClick={handleSettings} variant="ghost" size="icon-sm" className="ml-auto text-muted-foreground hover:text-synth-cyan group-data-[collapsible=icon]:hidden" aria-label="Open SYNTH settings">
            {(() => { const Icon = iconFor("settings"); return <Icon className="size-4" />; })()}
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
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
