"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconFor } from "@/lib/icons";
import type { SynthDocument } from "@/components/modules/types";

export function DocsList({ documents, selectedId, onSelect }: { documents: SynthDocument[]; selectedId?: string; onSelect: (id: string) => void }) {
  const DocumentIcon = iconFor("fileText");
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b border-border/70 pb-4"><div className="flex items-center justify-between gap-2"><CardTitle className="text-sm">Documents</CardTitle><Badge variant="outline" className="font-mono text-[9px]">{documents.length}</Badge></div></CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[18rem] lg:h-[30rem]"><div className="space-y-1 pr-2" role="list" aria-label="SYNTH document list">
          {documents.map((document) => { const isSelected = document.id === selectedId; return <Button key={document.id} type="button" variant="ghost" className={`h-auto min-h-14 w-full justify-start gap-2 px-2.5 py-2 text-left ${isSelected ? "border border-synth-violet/25 bg-synth-violet/5" : "text-muted-foreground"}`} onClick={() => onSelect(document.id)} aria-pressed={isSelected}><DocumentIcon className={`size-4 shrink-0 ${isSelected ? "text-synth-violet" : "text-muted-foreground"}`} aria-hidden="true" /><span className="min-w-0"><span className="block truncate text-[11px] text-foreground">{document.title}</span><span className="mt-1 block truncate text-[10px] text-muted-foreground">{document.updatedAt} · {document.summary}</span></span></Button>; })}
          {documents.length === 0 && <p className="px-2 py-5 text-center text-xs text-muted-foreground">No documents available.</p>}
        </div></ScrollArea>
      </CardContent>
    </Card>
  );
}
