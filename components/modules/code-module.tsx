"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CodeActions } from "@/components/modules/code-actions";
import { CodeFileTree } from "@/components/modules/code-file-tree";
import { CodeViewer } from "@/components/modules/code-viewer";
import { ModuleEmpty } from "@/components/modules/module-states";
import { SYNTH_CODE_FILES } from "@/components/modules/mock-data";
import { useEngineAction } from "@/components/modules/use-engine-action";
import type { ModuleAction, ModuleActionId, WorkspaceModuleProps } from "@/components/modules/types";

export function CodeModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [selectedPath, setSelectedPath] = useState(context.selectedFile ?? SYNTH_CODE_FILES[0]?.path ?? "");
  const selectedFile = useMemo(() => SYNTH_CODE_FILES.find((file) => file.path === selectedPath), [selectedPath]);
  const engine = useEngineAction({ project, context });

  const handleAction = async (id: ModuleActionId, label: string) => {
    const action: ModuleAction = { id, label, intent: "coding", payload: { path: selectedFile?.path ?? "" } };
    onAction?.(action);
    await engine.runAction(action);
  };

  if (!SYNTH_CODE_FILES.length) return <ModuleEmpty title="No repository files" description="SYNTH Code has no local files to display yet." />;

  return (
    <div className="space-y-4">
      <Card className="border-synth-cyan/20 bg-synth-cyan/5">
        <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold">Local repository browser</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Browse the current project context, inspect files, and stage AI actions without bypassing the Engine boundary.</p></div>
          <Badge variant="outline" className="w-fit border-synth-cyan/25 text-[9px] text-synth-cyan">{project.branch} · {project.language}</Badge>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)_16rem]">
        <CodeFileTree files={SYNTH_CODE_FILES} selectedPath={selectedPath} onSelect={(path) => { setSelectedPath(path); onAction?.({ id: "select-file", label: `Selected ${path}`, intent: "coding", payload: { path } }); }} />
        <CodeViewer file={selectedFile} />
        <CodeActions filePath={selectedFile?.path} actionState={engine.state} output={engine.output} error={engine.error} model={engine.model} onAction={handleAction} />
      </div>
    </div>
  );
}
