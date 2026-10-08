"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { VisionAnalysisPlaceholder } from "@/components/modules/vision-analysis-placeholder";
import { VisionUpload } from "@/components/modules/vision-upload";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import type { ModuleAction, VisionAsset, WorkspaceModuleProps } from "@/components/modules/types";

import { HandoffStore } from "@/lib/handoff/handoff-store";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function VisionModule({ project, context, handoff: initialHandoff, onAction }: WorkspaceModuleProps) {
  const [asset, setAsset] = useState<VisionAsset>();
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState("A futuristic cyan and violet SYNTH logo concept, polished product mark, dark background");
  const [generatedImage, setGeneratedImage] = useState<string>();
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const engine = useEngineAction({ project, context });

  // Consume handoff on mount or when changed
  const handledHandoffRef = useRef<string | null>(null);

  useEffect(() => {
    const handoff = initialHandoff ?? HandoffStore.consume("vision");
    if (!handoff) return;
    if (handledHandoffRef.current === handoff.id) return;
    handledHandoffRef.current = handoff.id;

    if (handoff.userRequest) {
      setPrompt(handoff.userRequest);
    }

    if (handoff.attachments && handoff.attachments.length > 0) {
      const img = handoff.attachments.find((a) => a.kind === "image" || a.mimeType?.startsWith("image/"));
      if (img && (img.url || img.dataUrl)) {
        setAsset({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType ?? "image/png",
          size: img.size ?? 1024,
          previewUrl: img.url || img.dataUrl!,
        });
      }
    }
  }, [initialHandoff]);

  useEffect(() => () => { if (asset?.previewUrl?.startsWith("blob:")) URL.revokeObjectURL(asset.previewUrl); }, [asset]);

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

  const generate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGenerationError("");
    setGeneratedImage(undefined);
    try {
      const response = await fetch("/api/ai/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json() as { image?: string; error?: string };
      if (!response.ok || !data.image) throw new Error(data.error ?? "SYNTH Vision is not currently configured for image generation.");
      setGeneratedImage(data.image);
    } catch (generationFailure) {
      setGenerationError(generationFailure instanceof Error ? generationFailure.message : "SYNTH Vision is not currently configured for image generation.");
    } finally {
      setGenerating(false);
    }
  };

  const analyze = async () => {
    if (!asset || engine.state === "loading") return;
    const action: ModuleAction = { id: "request-vision-analysis", label: `Analyze ${asset.name}`, intent: "vision", payload: { assetId: asset.id, name: asset.name } };
    onAction?.(action);
    await engine.runAction(action);
  };

  return (
    <div className="space-y-4">
      <Card className="border-synth-violet/20 bg-synth-violet/5"><CardHeader><CardTitle className="text-sm">Generate an image</CardTitle></CardHeader><CardContent className="flex flex-col gap-3"><label htmlFor="vision-prompt" className="text-xs font-medium">Prompt</label><Input id="vision-prompt" value={prompt} maxLength={2000} onChange={(event) => setPrompt(event.target.value)} /><Button type="button" onClick={() => void generate()} disabled={generating || !prompt.trim()}>{generating ? "Generating…" : "Generate with SYNTH Vision"}</Button>{generationError && <p className="text-xs text-destructive" role="alert">{generationError}</p>}{generatedImage && <img src={generatedImage} alt="Generated SYNTH Vision result" className="w-full rounded-lg border object-cover" />}</CardContent></Card>
      <VisionUpload asset={asset} error={error} onFile={stageFile} onRemove={removeFile} />
      <VisionAnalysisPlaceholder hasAsset={Boolean(asset)} state={engine.state} onAnalyze={() => void analyze()} />
      <ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} />
    </div>
  );
}
