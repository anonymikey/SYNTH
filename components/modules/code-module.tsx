"use client";

import { useCallback, useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { CodePreview } from "@/components/modules/code-preview";
import { CodeForge } from "@/components/modules/code-forge";
import { CodeWelcome } from "@/components/assistant/code-welcome";
import type { ModuleAction, ModuleActionId, WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { iconFor } from "@/lib/icons";

/* ------------------------------------------------------------------ */
/*  Mobile tab type                                                     */
/* ------------------------------------------------------------------ */

type MobileTab = "code" | "preview" | "forge";

/* ------------------------------------------------------------------ */
/*  CodeModule                                                          */
/* ------------------------------------------------------------------ */

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  /* ---- Layout state ---- */
  const [showIDE, setShowIDE] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showForge, setShowForge] = useState(true);

  /* ---- Mobile ---- */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("code");
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);

  /* ---- Tab management ---- */
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);

  /* ---- Responsive detection ---- */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        if (proj.selectedPath === path) {
          const idx = prev.findIndex((t) => t.path === path);
          const fallback = next[idx] ?? next[idx - 1];
          if (fallback) proj.loadFile(fallback.path);
        }
        return next;
      });
    },
    [proj],
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

  /* ---- Send message from welcome state ---- Routes to Forge ---- */
  const handleSendMessage = useCallback(
    (text: string) => {
      // Switch to IDE view — Forge panel becomes visible
      setShowIDE(true);
      // Fire the engine action — Forge will display user message + streaming response
      void handleAction("run-code-action", text);
    },
    [handleAction],
  );

  /* ---- Quick action from welcome state ---- */
  const handleQuickAction = useCallback(
    (action: string) => {
      if (action === "browse") {
        setShowIDE(true);
        return;
      }
      // Handle open:file actions
      if (action.startsWith("open:")) {
        const path = action.slice(5);
        setShowIDE(true);
        proj.loadFile(path);
        return;
      }
      handleSendMessage(action);
    },
    [handleSendMessage, proj],
  );

  /* ---- New chat ---- */
  const handleNewChat = useCallback(() => {
    setShowIDE(false);
    proj.clearSelection();
    setOpenTabs([]);
    // Reset engine state
    engine.runAction(
      { id: "run-code-action", label: "New Chat", intent: "coding", payload: {} },
      {},
    );
  }, [proj, engine]);

  // Loading state
  if (proj.loadingProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <ThinkingOrb state="connecting" size={20} theme="dark" />
        <p className="text-[10px] text-muted-foreground/50">Loading project...</p>
      </div>
    );
  }

  // Error state
  if (proj.error && !proj.project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-xs font-medium text-destructive">Failed to load project.</p>
        <button
          type="button"
          className="text-[10px] text-synth-cyan hover:underline"
          onClick={() => proj.refreshFiles()}
        >
          Retry
        </button>
      </div>
    );
  }

  /* ================================================================= */
  /*  MOBILE LAYOUT                                                     */
  /* ================================================================= */
  if (isMobile) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-3">
          <button
            type="button"
            className="text-[11px] font-semibold text-foreground"
            onClick={handleNewChat}
          >
            SYNTH Code
          </button>
          <div className="flex-1" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => setShowMobileDrawer(true)}
          >
            {(() => { const I = iconFor("files"); return <I className="size-3.5" />; })()}
          </Button>
        </div>

        {/* Mobile tabs */}
        <div className="flex shrink-0 items-center border-b border-border/40">
          {(["code", "preview", "forge"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`flex-1 py-2 text-center text-[10px] font-medium capitalize transition-colors ${
                mobileTab === tab
                  ? "border-b-2 border-synth-cyan text-synth-cyan"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMobileTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Mobile content */}
        <div className="min-h-0 flex-1">
          {mobileTab === "code" && (
            <div className="flex h-full flex-col">
              <CodeTabs
                tabs={openTabs}
                activePath={proj.selectedPath}
                onSelect={handleTabSelect}
                onClose={handleTabClose}
              />
              <div className="min-h-0 flex-1">
                {showIDE && proj.selectedPath ? (
                  <CodeViewer
                    file={proj.fileContent}
                    loading={proj.loadingContent}
                    adapterType={proj.project?.adapterType ?? "demo"}
                  />
                ) : (
                  <CodeWelcome
                    project={proj.project}
                    recentFiles={proj.recentFiles}
                    onSendMessage={handleSendMessage}
                    onQuickAction={handleQuickAction}
                    onOpenFiles={() => { setShowIDE(true); setMobileTab("code"); }}
                  />
                )}
              </div>
            </div>
          )}
          {mobileTab === "preview" && <CodePreview project={proj.project} />}
          {mobileTab === "forge" && (              <CodeForge filePath={proj.selectedPath} fileContent={proj.fileContent}
              lastActionLabel={engine.activeAction || null}
              actionState={engine.state}
              output={engine.output}
              error={engine.error}
              model={engine.model}
              onAction={handleAction}
              readOnly
            />
          )}
        </div>

        {/* Mobile explorer drawer */}
        {showMobileDrawer && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowMobileDrawer(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72">
              <CodeExplorer
                files={proj.files}
                selectedPath={proj.selectedPath}
                recentFiles={proj.recentFiles}
                searchResults={proj.searchResults}
                searching={proj.searching}
                onSelect={(p) => {
                  proj.loadFile(p);
                  setShowIDE(true);
                  setShowMobileDrawer(false);
                  setMobileTab("code");
                }}
                onSearch={proj.search}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  /* ================================================================= */
  /*  WELCOME STATE — compact: centered welcome + composer               */
  /*  When user submits → transitions to IDE with Forge active           */
  /* ================================================================= */
  if (!showIDE && !proj.selectedPath) {
    return (
      <div className="flex h-full overflow-hidden">
        <CodeWelcome
          project={proj.project}
          recentFiles={proj.recentFiles}
          onSendMessage={handleSendMessage}
          onQuickAction={handleQuickAction}
          onOpenFiles={() => setShowIDE(true)}
        />
      </div>
    );
  }

  /* ================================================================= */
  /*  DESKTOP IDE — Explorer | Editor | Forge (3-column)               */
  /* ================================================================= */
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <CodeToolbar
        project={proj.project}
        showExplorer={showExplorer}
        showPreview={showPreview}
        showForge={showForge}
        onToggleExplorer={() => setShowExplorer((o) => !o)}
        onTogglePreview={() => setShowPreview((o) => !o)}
        onToggleForge={() => setShowForge((o) => !o)}
        onNewChat={handleNewChat}
      />

      {/* Error banner */}
      {proj.error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-1 text-[9px] text-destructive">
          {proj.error}
        </div>
      )}

      {/* IDE panels */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        {/* Explorer */}
        {showExplorer && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-0">
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

        {/* Center: Editor + Preview (vertical split or standalone) */}
        <ResizablePanel
          defaultSize={showForge ? (showPreview ? 45 : 55) : showPreview ? 60 : 100}
          minSize={25}
          className="min-w-0"
        >
          <ResizablePanelGroup orientation="vertical">
            {/* Editor */}
            <ResizablePanel defaultSize={showPreview ? 60 : 100} minSize={20} className="min-w-0">
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

            {/* Preview (bottom) */}
            {showPreview && (
              <>
                <ResizableHandle withHandle className="bg-border/40" />
                <ResizablePanel defaultSize={40} minSize={15} maxSize={60} className="min-w-0">
                  <CodePreview project={proj.project} />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* Forge (right panel) — always shows conversation + streaming output */}
        {showForge && (
          <>
            <ResizableHandle withHandle className="bg-border/40" />
            <ResizablePanel defaultSize={30} minSize={25} maxSize={45} className="min-w-0">
              <CodeForge
                filePath={proj.selectedPath}
                fileContent={proj.fileContent}
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
    </div>
  );
}
