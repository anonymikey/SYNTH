"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { VisionAnalysisPlaceholder } from "@/components/modules/vision-analysis-placeholder";
import { VisionUpload } from "@/components/modules/vision-upload";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import type { ModuleAction, VisionAsset, WorkspaceModuleProps } from "@/components/modules/types";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function VisionModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [asset, setAsset] = useState<VisionAsset>();
  const [error, setError] = useState("");
  const engine = useEngineAction({ project, context });

  useEffect(() => () => { if (asset) URL.revokeObjectURL(asset.previewUrl); }, [asset]);

  const stageFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Choose an image file to continue."); return; }
    if (file.size > MAX_IMAGE_SIZE) { setError("Images must be smaller than 10 MB."); return; }
    if (asset) URL.revokeObjectURL(asset.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setAsset({ id: crypto.randomUUID(), name: file.name, mimeType: file.type, size: file.size, previewUrl });
    setError("");
    onAction?.({ id: "stage-vision-image", label: `Staged ${file.name}`, intent: "vision", payload: { name: file.name, mimeType: file.type } });
  };

  const removeFile = () => {
    if (asset) URL.revokeObjectURL(asset.previewUrl);
    setAsset(undefined);
    setError("");
    onAction?.({ id: "remove-vision-image", label: "Removed staged image", intent: "vision" });
  };

  const analyze = async () => {
    if (!asset || engine.state === "loading") return;
    const action: ModuleAction = { id: "request-vision-analysis", label: `Analyze ${asset.name}`, intent: "vision", payload: { assetId: asset.id, name: asset.name } };
    onAction?.(action);
    await engine.runAction(action);
  };

  return (
    <div className="space-y-4">
      <Card className="border-synth-violet/20 bg-synth-violet/5"><CardContent className="p-4 text-xs leading-5 text-muted-foreground">SYNTH Vision is a prepared capability seam. The upload, preview, validation, and placeholder states are functional while backend analysis remains Coming Soon.</CardContent></Card>
      <VisionUpload asset={asset} error={error} onFile={stageFile} onRemove={removeFile} />
      <VisionAnalysisPlaceholder hasAsset={Boolean(asset)} state={engine.state} onAnalyze={() => void analyze()} />
      <ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} />
    </div>
  );
}
