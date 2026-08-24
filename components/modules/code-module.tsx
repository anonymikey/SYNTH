"use client";

import { useCallback, useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useProject } from "@/lib/project/use-project";
import { CodeToolbar } from "@/components/modules/code-toolbar";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeTabs, type Tab } from "@/components/modules/code-tabs";
import { CodeViewer } from "@/components/modules/code-viewer";
import { CodePreview } from "@/components/modules/code-preview";
import { CodeForge } from "@/components/modules/code-forge";
import type { ModuleAction, ModuleActionId, WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  // Panel visibility
  const [showExplorer, setShowExplorer] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showForge, setShowForge] = useState(true);

  // Tab management
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
      // If closing the active file, switch to the next tab
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

  // Loading state
  if (proj.loadingProject) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <div className="size-6 animate-spin rounded-full border-2 border-synth-cyan/30 border-t-synth-cyan" />
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
      />

      {/* Error banner (non-fatal) */}
      {proj.error && (
        <div className="shrink-0 border-b border-destructive/20 bg-destructive/5 px-3 py-1.5 text-[10px] text-destructive">
          {proj.error}
        </div>
      )}

      {/* Main IDE layout */}
      <ResizablePanelGroup
        orientation="horizontal"
        className="min-h-0 flex-1"
        
      >
        {/* Explorer panel */}
        {showExplorer && (
          <>
            <ResizablePanel
              defaultSize={18}
              minSize={12}
              maxSize={30}
              className="min-w-0"
            >
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
          <ResizablePanelGroup orientation="vertical" >
            {/* Editor area */}
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

            {/* Forge panel (bottom) */}
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

        {/* Preview panel */}
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
  );
}
