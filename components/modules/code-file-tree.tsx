"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { iconFor } from "@/lib/icons";
import type { CodeFile } from "@/components/modules/types";

export function CodeFileTree({ files, selectedPath, onSelect }: { files: CodeFile[]; selectedPath: string; onSelect: (path: string) => void }) {
  const [query, setQuery] = useState("");
  const visibleFiles = useMemo(() => files.filter((file) => file.path.toLowerCase().includes(query.toLowerCase())), [files, query]);

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3 border-b border-border/70 pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm">Repository files</CardTitle>
          <Badge variant="outline" className="font-mono text-[9px]">{files.length}</Badge>
        </div>
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter files..." aria-label="Filter repository files" className="h-8 text-xs" />
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[18rem] lg:h-[30rem]">
          <div className="space-y-1 pr-2" role="list" aria-label="Repository file list">
            {visibleFiles.map((file) => {
              const FileIcon = iconFor(file.kind === "style" ? "fileText" : "fileCode");
              const isSelected = file.path === selectedPath;
              return (
                <Button
                  key={file.path}
                  type="button"
                  variant="ghost"
                  className={`h-auto min-h-10 w-full justify-start gap-2 px-2.5 py-2 text-left ${isSelected ? "border border-synth-cyan/25 bg-synth-cyan/5 text-foreground" : "text-muted-foreground"}`}
                  onClick={() => onSelect(file.path)}
                  aria-pressed={isSelected}
                >
                  <FileIcon className={`size-4 shrink-0 ${isSelected ? "text-synth-cyan" : "text-muted-foreground"}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-[11px]">{file.path}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/70">{file.updatedAt}</span>
                </Button>
              );
            })}
            {visibleFiles.length === 0 && <p className="px-2 py-5 text-center text-xs text-muted-foreground">No files match that filter.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
