"use client";

import { useCallback, useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { CodePreview } from "@/components/modules/code-preview";
import { CodeForge } from "@/components/modules/code-forge";
import { CodeSidebar, type CodeDraft } from "@/components/modules/code-sidebar";
import { CodeWelcome, type CodeChatMessage } from "@/components/assistant/code-welcome";
import type { ModuleAction, ModuleActionId, WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  /* ---- Layout state ---- */
  const [showIDE, setShowIDE] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showForge, setShowForge] = useState(true);

  /* ---- Chat / drafts state ---- */
  const [chatMessages, setChatMessages] = useState<CodeChatMessage[]>([]);
  const [drafts, setDrafts] = useState<CodeDraft[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

  /* ---- Tab management ---- */
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);

  // Sync selected file with tabs
  useEffect(() => {
    if (proj.selectedPath && proj.fileContent) {
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.path === proj.selectedPath);
        if (exists) return prev;
        const label = proj.selectedPath!.split("/").pop() ?? proj.selectedPath!;
        return [...prev, { path: proj.selectedPath!, label }];
      });
    }
  }, [proj.selectedPath, proj.fileContent]);

  const handleTabSelect = useCallback(
    (path: string) => {
      proj.loadFile(path);
    },
    [proj],
  );

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenTabs((prev) => prev.filter((t) => t.path !== path));
      if (proj.selectedPath === path) {
        setOpenTabs((prev) => {
          const idx = openTabs.findIndex((t) => t.path === path);
          const next = prev[idx] ?? prev[idx - 1];
          if (next) proj.loadFile(next.path);
          return prev;
        });
      }
    },
    [proj, openTabs],
  );

  /* ---- Forge action handler ---- */
  const handleAction = useCallback(
    async (id: ModuleActionId, label: string) => {
      const action: ModuleAction = {
        id,
        label,
        intent: "coding",
        payload: { path: proj.selectedPath ?? "" },
      };
      onAction?.(action);
      await engine.runAction(action, {
        fileContent: proj.fileContent,
        projectInfo: proj.project,
        searchResults: proj.searchResults,
      });
    },
    [proj.selectedPath, proj.fileContent, proj.project, proj.searchResults, engine, onAction],
  );

  /* ---- Send message from welcome state ---- */
  const handleSendMessage = useCallback(
    (text: string) => {
      // Add user message
      const userMsg: CodeChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, userMsg]);

      // Create draft if none active
      if (!activeDraftId) {
        const draftId = crypto.randomUUID();
        const draft: CodeDraft = {
          id: draftId,
          title: text.slice(0, 60),
          timestamp: Date.now(),
          messageCount: 1,
        };
        setDrafts((prev) => [draft, ...prev]);
        setActiveDraftId(draftId);
      } else {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === activeDraftId
              ? { ...d, timestamp: Date.now(), messageCount: d.messageCount + 1 }
              : d,
          ),
        );
      }

      // Open IDE and send to forge
      setShowIDE(true);
      void handleAction("run-code-action", text);
    },
    [activeDraftId, handleAction],
  );

  /* ---- Quick action from welcome state ---- */
  const handleQuickAction = useCallback(
    (action: string) => {
      if (action === "browse") {
        setShowIDE(true);
        return;
      }
      handleSendMessage(action);
    },
    [handleSendMessage],
  );

  /* ---- New chat ---- */
  const handleNewChat = useCallback(() => {
    setChatMessages([]);
    setActiveDraftId(null);
    setShowIDE(false);
    proj.clearSelection();
    setOpenTabs([]);
  }, [proj]);

  /* ---- Select draft ---- */
  const handleSelectDraft = useCallback((_id: string) => {
    // For now, just select — full draft persistence is a future feature
    setActiveDraftId(_id);
  }, []);

  /* ---- Responsive: collapse sidebar on mobile ---- */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    if (mq.matches) setShowSidebar(false);
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setShowSidebar(false);
      else setShowSidebar(true);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Loading state
  if (proj.loadingProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <ThinkingOrb state="connecting" size={64} theme="dark" />
        <p className="text-xs text-muted-foreground">Loading project context...</p>
      </div>
    );
  }

  // Error state
  if (proj.error && !proj.project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm font-medium text-destructive">Failed to load project.</p>
        <button
          type="button"
          className="text-xs text-synth-cyan hover:underline"
          onClick={() => proj.refreshFiles()}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ================================================================= */
  /*  WELCOME STATE — v0-style: sidebar + center chat                  */
  /* ================================================================= */
  if (!showIDE && !proj.selectedPath) {
    return (
      <div className="flex h-full overflow-hidden">
        {/* Sidebar */}
        <CodeSidebar
          project={proj.project}
          drafts={drafts}
          activeDraftId={activeDraftId}
          onSelectDraft={handleSelectDraft}
          onNewChat={handleNewChat}
          isOpen={showSidebar}
          onToggle={() => setShowSidebar((o) => !o)}
          onOpenFiles={() => setShowIDE(true)}
          isIDEActive={false}
        />

        {/* Center: chat panel */}
        <div className="min-w-0 flex-1">
          <CodeWelcome
            project={proj.project}
            messages={chatMessages}
            isBusy={engine.state === "loading"}
            output={engine.output}
            error={engine.error}
            model={engine.model}
            actionState={engine.state}
            onSendMessage={handleSendMessage}
            onQuickAction={handleQuickAction}
            onOpenFiles={() => setShowIDE(true)}
          />
        </div>
      </div>
    );
  }

  /* ================================================================= */
  /*  IDE STATE — full workspace with explorer/editor/forge/preview     */
  /* ================================================================= */
  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar — collapsed to icons in IDE mode */}
      <CodeSidebar
        project={proj.project}
        drafts={drafts}
        activeDraftId={activeDraftId}
        onSelectDraft={handleSelectDraft}
        onNewChat={handleNewChat}
        isOpen={showSidebar}
        onToggle={() => setShowSidebar((o) => !o)}
        onOpenFiles={() => setShowIDE(true)}
        isIDEActive={true}
      />

      {/* Main IDE area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <CodeToolbar
          project={proj.project}
          showExplorer={showExplorer}
          showPreview={showPreview}
          showForge={showForge}
          onToggleExplorer={() => setShowExplorer((o) => !o)}
          onTogglePreview={() => setShowPreview((o) => !o)}
          onToggleForge={() => setShowForge((o) => !o)}
          onToggleSidebar={() => setShowSidebar((o) => !o)}
        />

        {/* Error banner */}
        {proj.error && (
          <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[10px] text-destructive">
            {proj.error}
          </div>
        )}

        {/* IDE panels */}
        <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
          {/* Explorer */}
          {showExplorer && (
            <>
              <ResizablePanel defaultSize={18} minSize={12} maxSize={30} className="min-w-0">
                <CodeExplorer
                  files={proj.files}
                  selectedPath={proj.selectedPath}
                  recentFiles={proj.recentFiles}
                  searchResults={proj.searchResults}
                  searching={proj.searching}
                  onSelect={proj.loadFile}
                  onSearch={proj.search}
                />
              </ResizablePanel>
              <ResizableHandle withHandle className="bg-border/40" />
            </>
          )}

          {/* Center: Editor + Forge (vertical split) */}
          <ResizablePanel defaultSize={showPreview ? 50 : 65} minSize={30} className="min-w-0">
            <ResizablePanelGroup orientation="vertical">
              {/* Editor */}
              <ResizablePanel defaultSize={showForge ? 60 : 100} minSize={30} className="min-w-0">
                <div className="flex h-full flex-col">
                  <CodeTabs
                    tabs={openTabs}
                    activePath={proj.selectedPath}
                    onSelect={handleTabSelect}
                    onClose={handleTabClose}
                  />
                  <div className="min-h-0 flex-1">
                    <CodeViewer
                      file={proj.fileContent}
                      loading={proj.loadingContent}
                      adapterType={proj.project?.adapterType ?? "demo"}
                    />
                  </div>
                </div>
              </ResizablePanel>

              {/* Forge (bottom) */}
              {showForge && (
                <>
                  <ResizableHandle withHandle className="bg-border/40" />
                  <ResizablePanel defaultSize={40} minSize={20} maxSize={60} className="min-w-0">
                    <CodeForge
                      filePath={proj.selectedPath}
                      fileContent={proj.fileContent}
                      project={proj.project}
                      lastActionLabel={engine.activeAction || null}
                      actionState={engine.state}
                      output={engine.output}
                      error={engine.error}
                      model={engine.model}
                      onAction={handleAction}
                      readOnly
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* Preview */}
          {showPreview && (
            <>
              <ResizableHandle withHandle className="bg-border/40" />
              <ResizablePanel defaultSize={30} minSize={15} maxSize={45} className="min-w-0">
                <CodePreview project={proj.project} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
