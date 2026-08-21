"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { ContextPanel } from "@/components/layout/context-panel";
import { StatusBar } from "@/components/layout/status-bar";
import { AssistantWorkspace } from "@/components/assistant/assistant-workspace";
import { CommandPalette } from "@/components/workspace/command-palette";
import { AboutDialog } from "@/components/workspace/about-dialog";
import { NotificationsDialog } from "@/components/workspace/workspace-dialogs";
import { WorkspaceView, type WorkspaceDestination } from "@/components/workspace/workspace-view";
import { ConversationProvider, useConversations } from "@/modules/conversation/conversation-provider";
import { DEFAULT_CONTEXT, DEFAULT_PROJECT } from "@/lib/config/workspace";
import { SYNTH_MODULES, type ModuleDefinition } from "@/lib/config/modules";
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
  const [activeDestination, setActiveDestination] = useState<WorkspaceDestination>("assistant");
  const [contextOpen, setContextOpen] = useState(true);
  const [mobileContextOpen, setMobileContextOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const openNewChat = () => {
    conversations.create();
    setActiveDestination("assistant");
    toast.success("New SYNTH conversation ready");
  };

  const handleModuleSelect = (module: ModuleDefinition) => {
    setActiveDestination(module.id as WorkspaceDestination);
    if (module.status !== "active") toast.info(`${module.label} preview opened — capability work is staged for a future phase`);
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewChat();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setContextOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <SidebarProvider defaultOpen>
      <WorkspaceSidebar
        activeModule={activeDestination}
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
      />
      <SidebarInset className="min-w-0 overflow-hidden bg-background">
        <WorkspaceHeader
          onContextToggle={() => { setContextOpen(true); setMobileContextOpen(true); }}
          onOpenCommand={() => setCommandOpen(true)}
          onOpenNotifications={() => setNotificationsOpen(true)}
          onOpenSettings={() => setActiveDestination("settings")}
          onOpenAbout={() => setAboutOpen(true)}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          {activeDestination === "assistant" ? (
            <ResizablePanelGroup orientation="horizontal" className="h-full">
              <ResizablePanel defaultSize={contextOpen ? 74 : 100} minSize={55} className="min-w-0">
                <AssistantWorkspace
                  project={DEFAULT_PROJECT}
                  conversationId={conversations.active?.id}
                />
              </ResizablePanel>
              {contextOpen && (
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
        <StatusBar project={DEFAULT_PROJECT} model="auto" />
      </SidebarInset>

      {activeDestination === "assistant" && (
        <Sheet open={mobileContextOpen} onOpenChange={setMobileContextOpen}>
          <SheetContent side="right" className="w-[min(92vw,26rem)] p-0 md:hidden">
            <ContextPanel project={DEFAULT_PROJECT} context={DEFAULT_CONTEXT} onClose={() => setMobileContextOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} modules={SYNTH_MODULES} onModuleSelect={handleModuleSelect} onNewChat={openNewChat} onSettings={() => setActiveDestination("settings")} onToggleContext={() => setContextOpen((open) => !open)} />
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
      <NotificationsDialog open={notificationsOpen} onOpenChange={setNotificationsOpen} />
    </SidebarProvider>
  );
}
