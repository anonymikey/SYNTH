"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { CodePreview } from "@/components/modules/code-preview";
import { Forge, type ForgeMessage } from "@/components/modules/code-forge";
import { CodeWelcome } from "@/components/assistant/code-welcome";
import type { ModuleAction, ModuleActionId, ModuleActionState, WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { iconFor } from "@/lib/icons";

type MobileTab = "code" | "forge";

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  // --- Layout state ---
  const [showIDE, setShowIDE] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [forgeVisible, setForgeVisible] = useState(true);

  // --- Mobile ---
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("forge");

  // --- Forge conversation state (lifted here for stability) ---
  const [forgeMessages, setForgeMessages] = useState<ForgeMessage[]>([]);
  const activeActionIdRef = useRef<string | null>(null);

  // --- Tab management ---
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);

  // Responsive
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Sync tabs with file selection
  useEffect(() => {
    if (proj.selectedPath && proj.fileContent) {
      setOpenTabs((prev) => {
        const exists = prev.some((t) => t.path === proj.selectedPath);
        if (exists) return prev;
        return [...prev, { path: proj.selectedPath!, label: proj.selectedPath!.split("/").pop() || "" }];
      });
    }
  }, [proj.selectedPath, proj.fileContent]);

  const handleTabSelect = useCallback(
    (path: string) => { proj.loadFile(path); },
    [proj],
  );

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

  // --- Forge submission (the critical path) ---
  const sendToForge = useCallback(
    (userMessage: string) => {
      // Prevent duplicate rapid submissions
      if (engine.state === "loading") return;

      // Generate a unique request ID for this submission
      const requestId = crypto.randomUUID();

      // Record the user message (this happens synchronously, no useEffect)
      setForgeMessages(prev => [...prev, {
        role: "user" as const,
        content: userMessage,
        requestId,
        label: userMessage.length > 60 ? userMessage.slice(0, 60) + "..." : undefined,
      }]);

      // Launch the engine action — this triggers state changes in useEngineAction
      // which Forge renders via props. No intermediate useEffect needed.
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

  const handleQuickAction = useCallback((actionPrompt: string) => {
    if (engine.state === "loading") return;
    setShowIDE(true);
    sendToForge(actionPrompt);
  }, [engine.state, sendToForge]);

  const handleOpenFiles = useCallback(() => {
    setShowIDE(true);
  }, []);

  const handleNewChat = useCallback(() => {
    setShowIDE(false);
    setForgeMessages([]);
    setMobileTab("forge");
  }, []);

  // --- Loading/Error states ---
  if (proj.loadingProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <ThinkingOrb state="connecting" size={20} theme="dark" />
        <p className="text-[10px] text-muted-foreground/50">Loading project…</p>
      </div>
    );
  }

  if (proj.error && !proj.project) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <p className="text-xs font-medium text-red-400">Failed to load project.</p>
        <button className="text-xs text-[#2dd4bf] underline" onClick={() => proj.refreshFiles()}>Retry</button>
      </div>
    );
  }

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
      <div className="flex h-full flex-col bg-[#0a0c14]">
        <div className="flex items-center justify-between h-10 px-3 border-b border-white/[.06] shrink-0">
          <button type="button" className="text-[11px] font-semibold text-white" onClick={handleNewChat}>
            AI Code
          </button>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setMobileTab(mobileTab === "code" ? "forge" : "code")}>
            {mobileTab === "code" ? "AI" : "Code"}
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === "forge" ? (
            <div className="h-full flex flex-col">
              {!showIDE && !proj.selectedPath ? (
                <CodeWelcome
                  project={proj.project}
                  recentFiles={proj.recentFiles}
                  onSendMessage={handleQuickAction}
                  onQuickAction={(a) => a === "browse" ? handleOpenFiles() : handleQuickAction(a === "browse" ? "Describe the project" : `Explain this ${a.toLowerCase()}`)}
                  onOpenFiles={handleOpenFiles}
                />
              ) : (
                <div className="h-full flex flex-col">
                  <Forge {...forgeProps} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <CodeTabs
                tabs={openTabs}
                activePath={proj.selectedPath}
                onSelect={(p) => { proj.loadFile(p); setMobileTab("forge"); }}
                onClose={handleTabClose}
              />
              <div className="min-h-0 flex-1">
                <CodeViewer file={proj.fileContent} loading={proj.loadingContent} adapterType={proj.project?.adapterType ?? "demo"} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ─── WELCOME STATE ────────────────────────────────────────────── */
  if (!showIDE && !proj.selectedPath) {
    return (
      <div className="flex h-full overflow-hidden bg-[#0a0c14]">
        <CodeWelcome
          project={proj.project}
          recentFiles={proj.recentFiles}
          onSendMessage={handleQuickAction}
          onQuickAction={(action) => {
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

  /* ─── DESKTOP IDE (3-column: Explorer | Editor | Forge) ──────── */
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0a0c14]">
      <CodeToolbar
        project={proj.project}
        showExplorer={showExplorer}
        showPreview={showPreview}
        showForge={forgeVisible}
        onToggleExplorer={() => setShowExplorer(v => !v)}
        onTogglePreview={() => setShowPreview(v => !v)}
        onToggleForge={() => setForgeVisible(v => !v)}
        onNewChat={handleNewChat}
      />

      {proj.error && (
        <div className="shrink-0 border-b border-red-500/20 bg-red-500/5 px-3 py-1 text-[10px] text-red-400">
          {proj.error}
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Explorer */}
        {showExplorer && (
          <div className="flex-[0_0_220px] min-w-0 border-r border-white/[.06] max-xl:hidden">
            <CodeExplorer
              files={proj.files}
              selectedPath={proj.selectedPath}
              recentFiles={proj.recentFiles}
              searchResults={proj.searchResults}
              searching={proj.searching}
              onSelect={(p) => { proj.loadFile(p); }}
              onSearch={proj.search}
            />
          </div>
        )}

        {/* Editor or Welcome */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {showIDE || proj.selectedPath ? (
              <CodeViewer file={proj.fileContent} loading={proj.loadingContent} adapterType={proj.project?.adapterType ?? "demo"} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-3xl text-white/30 mb-3">&lt;/&gt;</div>
                  <p className="text-sm text-white/60">Select a file to inspect</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Forge panel — shrink-0 prevents flex from squeezing it */}
        {forgeVisible && (
          <div className="w-[380px] shrink-0 border-l border-white/[.06] overflow-hidden">
            <Forge {...forgeProps} />
          </div>
        )}
      </div>
    </div>
  );
}
