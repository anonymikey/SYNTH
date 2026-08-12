"use client";

/* Object URLs are local browser previews and cannot be optimized by next/image. */
/* eslint-disable @next/next/no-img-element */

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { iconFor } from "@/lib/icons";
import { formatFileSize } from "@/components/modules/formatters";
import type { VisionAsset } from "@/components/modules/types";

export function VisionUpload({ asset, error, onFile, onRemove }: { asset?: VisionAsset; error?: string; onFile: (file: File) => void; onRemove: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ImageIcon = iconFor("imagePlus");
  const XIcon = iconFor("x");
  const chooseFile = (file?: File) => { if (file) onFile(file); };

  return (
    <Card className="min-w-0 border-synth-violet/25 bg-synth-violet/5">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-synth-violet/10 text-synth-violet"><ImageIcon className="size-5" aria-hidden="true" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Prepare an image for SYNTH Vision</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Stage a local preview only. PNG, JPG, GIF, and WebP images up to 10 MB are accepted.</p></div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(event) => { chooseFile(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} aria-label="Choose an image for SYNTH Vision" />
          <Button type="button" variant="outline" className="min-h-10" onClick={() => inputRef.current?.click()}>Browse image</Button>
        </div>
        <div className="mt-4 rounded-xl border border-dashed border-synth-violet/30 bg-background/30 p-3 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" role={asset ? undefined : "button"} tabIndex={asset ? undefined : 0} aria-label={asset ? undefined : "Drop an image here or press Enter to browse"} onClick={() => { if (!asset) inputRef.current?.click(); }} onKeyDown={(event) => { if (!asset && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); inputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); chooseFile(event.dataTransfer.files[0]); }}>
          {asset ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><img src={asset.previewUrl} alt={`Preview of ${asset.name}`} className="h-32 w-full rounded-lg border border-border object-cover sm:w-48" /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{asset.name}</p><p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">{asset.mimeType} · {formatFileSize(asset.size)}</p></div><Button type="button" variant="ghost" size="icon-sm" className="self-end text-muted-foreground hover:text-destructive sm:self-center" onClick={onRemove} aria-label={`Remove ${asset.name}`}><XIcon className="size-4" /></Button></div> : <div className="py-6 text-center text-xs text-muted-foreground"><ImageIcon className="mx-auto size-5 text-synth-violet/70" aria-hidden="true" /><p className="mt-2">Drop an image here or use Browse image.</p></div>}
        </div>
        {error && <p className="mt-3 text-xs text-destructive" role="alert">{error}</p>}
        <Badge variant="outline" className="mt-3 border-synth-violet/25 text-[9px] text-synth-violet">Staged locally · no upload yet</Badge>
      </CardContent>
    </Card>
  );
}
