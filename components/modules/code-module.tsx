"use client";

import { useCallback, useEffect, useState } from "react";
import { ThinkingOrb } from "thinking-orbs";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { Forge, type ForgeMessage } from "@/components/modules/code-forge";
import { CodeWelcome } from "@/components/assistant/code-welcome";
import type { WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";

type MobileTab = "code" | "forge";

export function CodeModule({ project, context }: WorkspaceModuleProps) {
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
        {/* Mobile tab bar */}
        <div className="flex items-center h-10 px-3 border-b border-white/[.06] shrink-0 gap-2">
          <button type="button" className="text-[11px] font-semibold text-white/80" onClick={handleNewChat}>
            SYNTH Code
          </button>
          <div className="flex-1" />
          <div className="flex items-center rounded-lg bg-white/[0.04] border border-white/[.06] p-0.5">
            <button
              type="button"
              className={`px-3 py-1 rounded-md text-[10px] font-medium transition-colors ${mobileTab === "code" ? "bg-white/[0.08] text-white" : "text-white/40"}`}
              onClick={() => setMobileTab("code")}
            >
              Code
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-md text-[10px] font-medium transition-colors ${mobileTab === "forge" ? "bg-white/[0.08] text-white" : "text-white/40"}`}
              onClick={() => setMobileTab("forge")}
            >
              Forge
            </button>
          </div>
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
      <div className="h-full overflow-hidden bg-[#080a12] grid place-items-center">
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
    <div className="flex h-full flex-col overflow-hidden bg-[#080a12]">
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
        {/* Explorer — 240px fixed */}
        {showExplorer && (
          <div className="w-[240px] shrink-0 border-r border-white/[.06] overflow-hidden max-xl:hidden">
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

        {/* Center — Editor or empty state */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            {showIDE || proj.selectedPath ? (
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
        </div>

        {/* Forge — 380px fixed, never shrinks */}
        {forgeVisible && (
          <div className="w-[380px] shrink-0 border-l border-white/[.06] overflow-hidden">
            <Forge {...forgeProps} />
          </div>
        )}
      </div>
    </div>
  );
}
