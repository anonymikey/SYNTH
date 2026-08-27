"use client";

import { useCallback, useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { Forge, type ForgeMessage } from "@/components/modules/code-forge";
import { CodePreview } from "@/components/modules/code-preview";
import { CodeWelcome } from "@/components/assistant/code-welcome";
import type { WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type WorkspaceState = "ready" | "building" | "active";
type MobileTab = "code" | "preview" | "forge";
type CenterView = "editor" | "preview";

/* ------------------------------------------------------------------ */
/*  CodeModule — IDE with state machine and responsive layout          */
/* ------------------------------------------------------------------ */

export function CodeModule({ project, context }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  // --- Workspace state machine ---
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>("ready");
  const [centerView, setCenterView] = useState<CenterView>("editor");

  // --- Panel visibility ---
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [forgeVisible, setForgeVisible] = useState(true);

  // --- Responsive ---
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("forge");
  const [mobileExplorerOpen, setMobileExplorerOpen] = useState(false);

  // --- Forge conversation ---
  const [forgeMessages, setForgeMessages] = useState<ForgeMessage[]>([]);

  // --- Tab management ---
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);

  // --- Responsive detection ---
  useEffect(() => {
    const mobileMq = window.matchMedia("(max-width: 640px)");
    const tabletMq = window.matchMedia("(min-width: 641px) and (max-width: 1024px)");
    const onChange = () => {
      setIsMobile(mobileMq.matches);
      setIsTablet(tabletMq.matches);
    };
    onChange();
    mobileMq.addEventListener("change", onChange);
    tabletMq.addEventListener("change", onChange);
    return () => {
      mobileMq.removeEventListener("change", onChange);
      tabletMq.removeEventListener("change", onChange);
    };
  }, []);

  // --- Sync tabs with file selection ---
  useEffect(() => {
    if (proj.selectedPath && proj.fileContent) {
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.path === proj.selectedPath);
        if (exists) return prev;
        return [...prev, { path: proj.selectedPath!, label: proj.selectedPath!.split("/").pop() || "" }];
      });
    }
  }, [proj.selectedPath, proj.fileContent]);

  const handleTabClose = useCallback(
    (path: string) => {
      setOpenTabs(prev => {
        const next = prev.filter(t => t.path !== path);
        if (proj.selectedPath === path) {
          const idx = prev.findIndex(t => t.path === path);
          const fb = next[idx] || next[idx - 1];
          if (fb) proj.loadFile(fb.path);
        }
        return next;
      });
    },
    [proj],
  );

  // --- Forge submission ---
  const sendToForge = useCallback(
    (userMessage: string) => {
      if (engine.state === "loading") return;

      const requestId = crypto.randomUUID();

      setForgeMessages(prev => [...prev, {
        role: "user" as const,
        content: userMessage,
        requestId,
        label: userMessage.length > 60 ? userMessage.slice(0, 60) + "..." : undefined,
      }]);

      engine.runAction({
        id: "run-code-action",
        label: userMessage,
        intent: "coding",
        payload: { path: proj.selectedPath ?? "" },
      }, {
        fileContent: proj.fileContent,
        projectInfo: proj.project,
        searchResults: proj.searchResults,
      });
    },
    [engine, proj.selectedPath, proj.fileContent, proj.project, proj.searchResults],
  );

  // --- Quick action handler ---
  const handleQuickAction = useCallback((actionPrompt: string) => {
    if (engine.state === "loading") return;
    setWorkspaceState("building");
    sendToForge(actionPrompt);
  }, [engine.state, sendToForge]);

  // --- State transitions ---
  useEffect(() => {
    if (workspaceState === "building" && engine.state === "loading") {
      // Building state is active, keep it until engine finishes or provides output
    }
    if (workspaceState === "building" && (engine.state === "success" || engine.state === "error" || engine.output)) {
      setWorkspaceState("active");
    }
  }, [workspaceState, engine.state, engine.output]);

  // --- Enter IDE on file selection ---
  useEffect(() => {
    if (proj.selectedPath && workspaceState === "ready") {
      setWorkspaceState("active");
    }
  }, [proj.selectedPath, workspaceState]);

  // --- Panel toggles ---
  const handleToggleExplorer = useCallback(() => {
    if (isMobile) {
      setMobileExplorerOpen(prev => !prev);
    } else {
      setShowExplorer(v => !v);
    }
  }, [isMobile]);

  const handleTogglePreview = useCallback(() => {
    if (isMobile) {
      setMobileTab("preview");
    } else {
      setShowPreview(v => {
        if (!v) setCenterView("preview");
        else setCenterView("editor");
        return !v;
      });
    }
  }, [isMobile]);

  const handleToggleForge = useCallback(() => {
    if (isMobile) {
      setMobileTab("forge");
    } else {
      setForgeVisible(v => !v);
    }
  }, [isMobile]);

  const handleNewChat = useCallback(() => {
    setWorkspaceState("ready");
    setForgeMessages([]);
    setMobileTab("forge");
    setOpenTabs([]);
    setCenterView("editor");
    setShowExplorer(true);
    setShowPreview(false);
    setForgeVisible(true);
  }, []);

  // --- Loading/Error states ---
  if (proj.loadingProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#080a12]">
        <ThinkingOrb state="connecting" size={64} theme="dark" />
        <p className="text-[11px] text-white/30">Loading project...</p>
      </div>
    );
  }

  if (proj.error && !proj.project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#080a12]">
        <p className="text-xs font-medium text-red-400">Failed to load project.</p>
        <button className="text-xs text-[#2dd4bf] underline" onClick={() => proj.refreshFiles()}>Retry</button>
      </div>
    );
  }

  // --- Forge props ---
  const forgeProps = {
    filePath: proj.selectedPath,
    fileContent: proj.fileContent,
    messages: forgeMessages,
    isBusy: engine.state === "loading",
    currentOutput: engine.output ?? "",
    currentLabel: engine.activeAction || null,
    error: engine.error,
    model: engine.model ?? "synth-code",
    onAction: sendToForge,
  };

  /* ─── MOBILE ────────────────────────────────────────────────────── */
  if (isMobile) {
    return (
      <div className="flex h-full flex-col bg-[#080a12]">
        {/* Mobile top bar */}
        <div className="flex items-center h-10 px-3 border-b border-white/[.06] shrink-0 gap-2">
          <button type="button" className="text-[11px] font-semibold text-white/80" onClick={handleNewChat}>
            SYNTH Code
          </button>
          <div className="flex-1" />
          <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[.06] p-0.5">
            {(["forge", "code", "preview"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${mobileTab === tab ? "bg-white/[0.08] text-white" : "text-white/40"}`}
                onClick={() => setMobileTab(tab)}
              >
                {tab === "forge" ? "Forge" : tab === "code" ? "Code" : "Preview"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* Mobile Forge tab */}
          {mobileTab === "forge" && (
            <div className="h-full flex flex-col">
              {!workspaceState.startsWith("active") && !proj.selectedPath ? (
                <CodeWelcome
                  project={proj.project}
                  recentFiles={proj.recentFiles}
                  onSendMessage={handleQuickAction}
                  onQuickAction={(a: string) => {
                    if (a === "browse") { handleOpenFiles(); return; }
                    handleQuickAction(a === "Explain" ? "Explain this project" : a === "Review" ? "Review this project" : `Do: ${a}`);
                  }}
                  onOpenFiles={() => { setWorkspaceState("active"); }}
                />
              ) : (
                <div className="h-full flex flex-col">
                  <Forge {...forgeProps} />
                </div>
              )}
            </div>
          )}

          {/* Mobile Code tab */}
          {mobileTab === "code" && (
            <div className="flex flex-col h-full">
              {/* Explorer drawer toggle */}
              <div className="flex items-center h-8 shrink-0 border-b border-white/[.04] px-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-[10px] text-white/50 hover:text-white/70 transition-colors"
                  onClick={() => setMobileExplorerOpen(true)}
                >
                  <span className="text-white/30">📁</span>
                  <span>Explorer</span>
                </button>
              </div>
              {/* Explorer drawer */}
              {mobileExplorerOpen && (
                <div className="absolute inset-0 z-50 bg-[#080a12] animate-fade-in">
                  <div className="flex items-center h-10 px-3 border-b border-white/[.06]">
                    <span className="text-[11px] font-medium text-white/70">Files</span>
                    <div className="flex-1" />
                    <button
                      type="button"
                      className="text-[10px] text-white/40 hover:text-white/60"
                      onClick={() => setMobileExplorerOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                  <CodeExplorer
                    files={proj.files}
                    selectedPath={proj.selectedPath}
                    recentFiles={proj.recentFiles}
                    searchResults={proj.searchResults}
                    searching={proj.searching}
                    onSelect={(p) => { proj.loadFile(p); setMobileExplorerOpen(false); setMobileTab("code"); }}
                    onSearch={proj.search}
                  />
                </div>
              )}
              <CodeTabs
                tabs={openTabs}
                activePath={proj.selectedPath}
                onSelect={(p) => { proj.loadFile(p); }}
                onClose={handleTabClose}
              />
              <div className="min-h-0 flex-1">
                <CodeViewer file={proj.fileContent} loading={proj.loadingContent} adapterType={proj.project?.adapterType ?? "demo"} />
              </div>
            </div>
          )}

          {/* Mobile Preview tab */}
          {mobileTab === "preview" && (
            <CodePreview project={proj.project} />
          )}
        </div>
      </div>
    );
  }

  /* ─── TABLET ────────────────────────────────────────────────────── */
  if (isTablet) {
    return (
      <div className="flex h-full flex-col bg-[#080a12]">
        {/* Toolbar */}
        <CodeToolbar
          project={proj.project}
          showExplorer={showExplorer}
          showPreview={showPreview}
          showForge={forgeVisible}
          centerView={centerView}
          onToggleExplorer={handleToggleExplorer}
          onTogglePreview={handleTogglePreview}
          onToggleForge={handleToggleForge}
          onNewChat={handleNewChat}
        />

        {/* Error bar */}
        {proj.error && (
          <div className="shrink-0 border-b border-red-500/20 bg-red-500/5 px-3 py-1 text-[10px] text-red-400">
            {proj.error}
          </div>
        )}

        <div className="flex-1 flex min-h-0">
          {/* Explorer — collapsible on tablet */}
          {showExplorer && (
            <div className="w-[220px] shrink-0 border-r border-white/[.06] overflow-hidden animate-slide-in-left">
              <CodeExplorer
                files={proj.files}
                selectedPath={proj.selectedPath}
                recentFiles={proj.recentFiles}
                searchResults={proj.searchResults}
                searching={proj.searching}
                onSelect={(p) => { proj.loadFile(p); setCenterView("editor"); }}
                onSearch={proj.search}
              />
            </div>
          )}

          {/* Center — Editor or Preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            {centerView === "editor" ? (
              <>
                <CodeTabs
                  tabs={openTabs}
                  activePath={proj.selectedPath}
                  onSelect={(p) => proj.loadFile(p)}
                  onClose={handleTabClose}
                />
                <div className="flex-1 min-h-0">
                  <CodeViewer file={proj.fileContent} loading={proj.loadingContent} adapterType={proj.project?.adapterType ?? "demo"} />
                </div>
              </>
            ) : (
              <CodePreview project={proj.project} />
            )}
          </div>

          {/* Forge — 340px on tablet */}
          {forgeVisible && (
            <div className="w-[340px] shrink-0 border-l border-white/[.06] overflow-hidden animate-slide-in-right">
              <Forge {...forgeProps} />
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── WELCOME STATE (desktop) ──────────────────────────────────── */
  if (workspaceState === "ready" && !proj.selectedPath) {
    return (
      <div className="h-full overflow-hidden bg-[#080a12]">
        <CodeWelcome
          project={proj.project}
          recentFiles={proj.recentFiles}
          onSendMessage={handleQuickAction}
          onQuickAction={(action: string) => {
            if (action === "browse") { handleOpenFiles(); return; }
            if (action.startsWith("open:")) {
              const path = action.slice(5);
              handleOpenFiles();
              proj.loadFile(path);
              return;
            }
            handleQuickAction(action === "Explain" ? "Explain this project" : action === "Review" ? "Review this project" : `Do: ${action}`);
          }}
          onOpenFiles={handleOpenFiles}
        />
      </div>
    );
  }

  /* ─── DESKTOP IDE (3-column: Explorer | Editor/Preview | Forge) ── */
  const isTransitioning = workspaceState === "building";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#080a12]">
      <CodeToolbar
        project={proj.project}
        showExplorer={showExplorer}
        showPreview={showPreview}
        showForge={forgeVisible}
        centerView={centerView}
        onToggleExplorer={handleToggleExplorer}
        onTogglePreview={handleTogglePreview}
        onToggleForge={handleToggleForge}
        onNewChat={handleNewChat}
      />

      {proj.error && (
        <div className="shrink-0 border-b border-red-500/20 bg-red-500/5 px-3 py-1 text-[10px] text-red-400">
          {proj.error}
        </div>
      )}

      {/* Building transition overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#080a12]/90 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-4">
            <ThinkingOrb state="working" size={64} theme="dark" />
            <div className="flex flex-col items-center gap-1">
              <p className="text-[13px] text-white/70 font-medium">Analyzing project...</p>
              <div className="w-48 h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#2dd4bf] to-[#9670ff] animate-[progress-step_2s_ease-in-out_infinite]" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Explorer — 240px fixed */}
        {showExplorer && (
          <div className="w-[240px] shrink-0 border-r border-white/[.06] overflow-hidden max-xl:hidden animate-slide-in-left">
            <CodeExplorer
              files={proj.files}
              selectedPath={proj.selectedPath}
              recentFiles={proj.recentFiles}
              searchResults={proj.searchResults}
              searching={proj.searching}
              onSelect={(p) => { proj.loadFile(p); setCenterView("editor"); }}
              onSearch={proj.search}
            />
          </div>
        )}

        {/* Center — Editor or Preview */}
        <div className="flex-1 min-w-0 flex flex-col">
          {centerView === "editor" ? (
            <>
              <CodeTabs
                tabs={openTabs}
                activePath={proj.selectedPath}
                onSelect={(p) => proj.loadFile(p)}
                onClose={handleTabClose}
              />
              <div className="flex-1 min-h-0">
                {proj.selectedPath ? (
                  <CodeViewer file={proj.fileContent} loading={proj.loadingContent} adapterType={proj.project?.adapterType ?? "demo"} />
                ) : (
                  <div className="h-full grid place-items-center">
                    <div className="text-center">
                      <div className="text-3xl text-white/20 mb-3">&lt;/&gt;</div>
                      <p className="text-sm text-white/40">Select a file to inspect</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <CodePreview project={proj.project} />
          )}
        </div>

        {/* Forge — 380px fixed, never shrinks */}
        {forgeVisible && (
          <div className="w-[380px] shrink-0 border-l border-white/[.06] overflow-hidden animate-slide-in-right">
            <Forge {...forgeProps} />
          </div>
        )}
      </div>
    </div>
  );

  // Helper for file open
  function handleOpenFiles() {
    setWorkspaceState("active");
    setShowExplorer(true);
  }
}
