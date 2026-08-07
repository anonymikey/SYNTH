"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatLineNumber } from "@/components/modules/formatters";
import type { CodeFile } from "@/components/modules/types";

export function CodeViewer({ file }: { file?: CodeFile }) {
  const [view, setView] = useState("viewer");

  if (!file) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a file to inspect it.</CardContent></Card>;

  const lines = file.content.split("\n");
  const lineNumberWidth = String(lines.length).length;

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-3 border-b border-border/70 pb-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{file.path}</CardTitle>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{file.language} · read-only workspace preview</p>
          </div>
          <Badge variant="outline" className="shrink-0 border-synth-cyan/25 text-[9px] text-synth-cyan">local file</Badge>
        </div>
        <Tabs value={view} onValueChange={setView}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="viewer" className="flex-none text-xs">Code viewer</TabsTrigger>
            <TabsTrigger value="editor" className="flex-none text-xs">Editor placeholder</TabsTrigger>
          </TabsList>
          <TabsContent value="viewer" className="mt-3">
            <div className="overflow-auto rounded-lg border border-border bg-background/70" aria-label={`Code viewer for ${file.path}`}>
              <pre className="min-w-max p-3 font-mono text-[11px] leading-6 text-foreground/85">
                <code>
                  {lines.map((line, index) => (
                    <span key={`${file.path}-${index}`} className="grid grid-cols-[3rem_minmax(0,1fr)]">
                      <span className="select-none pr-3 text-right text-muted-foreground/45">{formatLineNumber(index + 1, lineNumberWidth)}</span>
                      <span className="whitespace-pre">{line || " "}</span>
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </TabsContent>
          <TabsContent value="editor" className="mt-3">
            <div className="space-y-3">
              <Textarea value={file.content} readOnly aria-label={`Editor preview for ${file.path}`} className="min-h-[22rem] resize-y rounded-lg border-border bg-background/70 font-mono text-[11px] leading-6" />
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70" role="status">Editing is reserved for the SYNTH Code capability phase.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardHeader>
    </Card>
  );
}
