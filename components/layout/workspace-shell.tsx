"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { ContextPanel } from "@/components/layout/context-panel";
import { StatusBar } from "@/components/layout/status-bar";
import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import type { PromptComposerHandle } from "@/components/assistant/prompt-composer";
import { SynthDashboard } from "@/components/dashboard/synth-dashboard";
import { CommandPalette } from "@/components/workspace/command-palette";
import { AboutDialog } from "@/components/workspace/about-dialog";
import { NotificationsDialog } from "@/components/workspace/workspace-dialogs";
import { WorkspaceView, type WorkspaceDestination } from "@/components/workspace/workspace-view";
import { ConversationProvider, useConversations } from "@/modules/conversation/conversation-provider";
import { DEFAULT_CONTEXT, DEFAULT_PROJECT } from "@/lib/config/workspace";
import { SYNTH_MODULES, type ModuleDefinition } from "@/lib/config/modules";
import { useSynthShortcuts } from "@/lib/shortcuts/use-synth-shortcuts";
import { useTheme } from "@/components/theme/theme-provider";
import type { WorkspaceArea } from "@/components/workspace/workspace-view-types";

export function WorkspaceShell() {
  return (
    <ConversationProvider>
      <WorkspaceShellInner />
    </ConversationProvider>
  );
}

function WorkspaceShellInner() {
  const conversations = useConversations();
  const [activeDestination, setActiveDestination] = useState<WorkspaceDestination>("dashboard");
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [assistantFullscreen, setAssistantFullscreen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const composerRef = useRef<PromptComposerHandle>(null);

  const openNewChat = useCallback(() => {
    conversations.create();
    setActiveDestination("assistant");
  }, [conversations]);

  const handleModuleSelect = (module: ModuleDefinition) => {
    const dest = module.id as WorkspaceDestination;
    setActiveDestination(dest);
    if (module.status !== "active") toast.info(`${module.label} preview opened — staged for a future phase`);
  };

  const handleAreaSelect = (area: WorkspaceArea) => setActiveDestination(area);

  const handleSelectConversation = (id: string) => {
    conversations.select(id);
    setActiveDestination("assistant");
  };

  const handleDeleteConversation = (id: string) => {
    conversations.remove(id);
    toast.success("Conversation deleted");
  };

  const handlePinConversation = (id: string) => {
    conversations.togglePin(id);
  };

  // Conversation navigation helpers
  const navigateConversation = useCallback(
    (direction: "prev" | "next") => {
      const summaries = conversations.summaries;
      if (summaries.length === 0) return;
      const currentIdx = summaries.findIndex((s) => s.id === conversations.active?.id);
      const nextIdx = direction === "prev"
        ? Math.max(0, currentIdx - 1)
        : Math.min(summaries.length - 1, currentIdx + 1);
      if (nextIdx !== currentIdx && summaries[nextIdx]) {
        conversations.select(summaries[nextIdx].id);
        setActiveDestination("assistant");
      }
    },
    [conversations]
  );

  const { toggleTheme } = useTheme();

  // Centralized SYNTH shortcuts
  useSynthShortcuts({
    toggleCommandPalette: () => setCommandOpen((o) => !o),
    newChat: openNewChat,
    toggleSidebar: () => {
      const trigger = document.querySelector("[data-sidebar='trigger']") as HTMLButtonElement;
      trigger?.click();
    },
    toggleContext: () => setContextOpen((o) => !o),
    focusComposer: () => composerRef.current?.focus(),
    prevConversation: () => navigateConversation("prev"),
    nextConversation: () => navigateConversation("next"),
    closeOverlays: () => {
      setCommandOpen(false);
      setAboutOpen(false);
      setNotificationsOpen(false);
      setMobileContextOpen(false);
    },
    toggleTheme,
    openModelSelector: () => composerRef.current?.focus(),
  });

  const toggleSidebar = useCallback(() => {
    const trigger = document.querySelector("[data-sidebar='trigger']") as HTMLButtonElement;
    trigger?.click();
  }, []);

  return (
    <SidebarProvider defaultOpen className={assistantFullscreen ? "fixed inset-0 z-50 min-h-0 bg-background" : "min-h-0"} style={{ height: "100dvh" }}>
      {!assistantFullscreen && <WorkspaceSidebar
        activeModule={activeDestination}
        onDashboard={() => setActiveDestination("dashboard")}
        onSelectModule={handleModuleSelect}
        onSelectArea={handleAreaSelect}
        onNewChat={openNewChat}
        onSettings={() => setActiveDestination("settings")}
        onOpenCommand={() => setCommandOpen(true)}
        conversations={conversations.summaries}
        activeConversationId={conversations.active?.id ?? null}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        onPinConversation={handlePinConversation}
      />}
      <SidebarInset className="flex h-full min-h-0 min-w-0 w-0 flex-1 overflow-hidden bg-background">
        {!assistantFullscreen && <WorkspaceHeader
          destination={activeDestination}
          onContextToggle={() => { setContextOpen(true); setMobileContextOpen(true); }}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSettings={() => setActiveDestination("settings")}
          onOpenAbout={() => setAboutOpen(true)}
        />}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {activeDestination === "dashboard" ? (
            <SynthDashboard
              conversations={conversations.summaries}
              onSelectConversation={(id) => { conversations.select(id); setActiveDestination("assistant"); }}
              onNewChat={openNewChat}
              onNavigateToModule={handleModuleSelect}
            />
          ) : activeDestination === "assistant" ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={contextOpen ? 74 : 100} minSize={55} className="min-w-0">
                <AssistantWorkspace
                  project={DEFAULT_PROJECT}
                  conversationId={conversations.active?.id}
                  composerRef={composerRef}
                  fullscreen={assistantFullscreen}
                  onFullscreenChange={setAssistantFullscreen}
                />
              </ResizablePanel>
              {contextOpen && !assistantFullscreen && (
                <>
                  <ResizableHandle withHandle className="bg-border/60" />
                  <ResizablePanel defaultSize={26} minSize={22} maxSize={38} className="hidden min-w-0 md:block">
                    <ContextPanel project={DEFAULT_PROJECT} context={DEFAULT_CONTEXT} onClose={() => setContextOpen(false)} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          ) : (
            <WorkspaceView destination={activeDestination} onBackToAssistant={() => setActiveDestination("assistant")} />
          )}
        </div>
        {!assistantFullscreen && <StatusBar project={DEFAULT_PROJECT} />}
      </SidebarInset>

      {activeDestination === "assistant" && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="right" className="w-[min(92vw,26rem)] p-0 md:hidden">
            <ContextPanel project={DEFAULT_PROJECT} context={DEFAULT_CONTEXT} onClose={() => setMobileContextOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        modules={SYNTH_MODULES}
        onModuleSelect={handleModuleSelect}
        onNewChat={openNewChat}
        onSettings={() => setActiveDestination("settings")}
        onToggleContext={() => setContextOpen((o) => !o)}
        onToggleSidebar={toggleSidebar}
        onFocusComposer={() => composerRef.current?.focus()}
        onToggleTheme={toggleTheme}
        onOpenModelSelector={() => composerRef.current?.focus()}
      />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <NotificationsDialog open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </SidebarProvider>
  );
}
