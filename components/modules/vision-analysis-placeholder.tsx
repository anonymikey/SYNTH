import { Button } from "@/components/ui/button";
import { ModuleComingSoon } from "@/components/modules/module-states";

export function VisionAnalysisPlaceholder({ hasAsset, requested, onAnalyze }: { hasAsset: boolean; requested: boolean; onAnalyze: () => void }) {
  if (!hasAsset) return <ModuleComingSoon title="Vision analysis is not connected yet" description="Stage an image above to prepare the future understanding pipeline. SYNTH Vision remains marked Coming Soon until its provider-neutral contract is available." />;
  if (requested) return <ModuleComingSoon title="Analysis request staged" description="The image is ready for a future SYNTH Vision engine request. No provider or upload endpoint is called in this foundation phase." />;
  return <div className="rounded-xl border border-synth-violet/25 bg-synth-violet/5 p-4"><p className="text-sm font-semibold">Ready for analysis</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Vision understanding is Coming Soon, but this staged action confirms the upload and preview path.</p><Button type="button" variant="outline" className="mt-3" onClick={onAnalyze}>Analyze image</Button></div>;
}
