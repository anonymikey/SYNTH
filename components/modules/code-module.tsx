"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProject } from "@/lib/project/use-project";
import { CodeExplorer } from "@/components/modules/code-explorer";
import { CodeViewer } from "@/components/modules/code-viewer";
import { CodeForge } from "@/components/modules/code-forge";
import { ProjectHeader } from "@/components/modules/project-header";
import type { ModuleAction, ModuleActionId, WorkspaceModuleProps } from "@/components/modules/types";
import { useEngineAction } from "@/components/modules/use-engine-action";

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const proj = useProject();
  const engine = useEngineAction({ project, context });

  const handleAction = async (id: ModuleActionId, label: string) => {
    const action: ModuleAction = {
      id,
      label,
      intent: "coding",
      payload: { path: proj.selectedPath ?? "" },
    };
    onAction?.(action);
    await engine.runAction(action);
  };

  // Loading state
  if (proj.loadingProject) {
    return (
      <div className="space-y-4" role="status" aria-live="polite">
        <Card className="border-synth-cyan/20 bg-synth-cyan/5">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="size-5 animate-spin rounded-full border-2 border-synth-cyan/30 border-t-synth-cyan" />
            <p className="text-sm text-muted-foreground">Loading project context...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (proj.error && !proj.project) {
    return (
      <Card className="border-destructive/25 bg-destructive/5">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="text-destructive text-sm font-medium">Failed to load project.</span>
          <Button variant="outline" size="sm" onClick={() => proj.refreshFiles()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Project Header */}
      <ProjectHeader
        project={proj.project}
        recentFiles={proj.recentFiles}
        onSelectFile={proj.loadFile}
      />

      {/* Error banner (non-fatal) */}
      {proj.error && (
        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {proj.error}
        </div>
      )}

      {/* Three-column layout: Explorer | Viewer | Forge */}
      <div className="grid min-w-0 gap-3 lg:grid-cols-[14rem_minmax(0,1fr)_16rem]">
        {/* LEFT: Explorer */}
        <CodeExplorer
          files={proj.files}
          selectedPath={proj.selectedPath}
          recentFiles={proj.recentFiles}
          searchResults={proj.searchResults}
          searching={proj.searching}
          onSelect={proj.loadFile}
          onSearch={proj.search}
        />

        {/* CENTER: Code Viewer */}
        <CodeViewer
          file={proj.fileContent}
          loading={proj.loadingContent}
          adapterType={proj.project?.adapterType ?? "demo"}
        />

        {/* RIGHT: Forge / AI Actions */}
        <CodeForge
          filePath={proj.selectedPath}
          fileName={proj.fileContent?.path}
          actionState={engine.state}
          output={engine.output}
          error={engine.error}
          model={engine.model}
          onAction={handleAction}
          readOnly
        />
      </div>
    </div>
  );
}
