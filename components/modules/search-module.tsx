"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchResults } from "@/components/modules/search-results";
import { MarkdownViewer } from "@/components/modules/markdown-viewer";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { SYNTH_CODE_FILES, SYNTH_DOCUMENTS, SYNTH_SEARCH_RECORDS } from "@/components/modules/mock-data";
import type { ModuleAction, SearchRecord, WorkspaceModuleProps } from "@/components/modules/types";

export function SearchModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [input, setInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SearchRecord | null>(null);
  const results = useMemo(() => {
    const normalized = input.trim().toLowerCase();
    if (!normalized) return [];
    return SYNTH_SEARCH_RECORDS.filter((record) => `${record.title} ${record.excerpt} ${record.source} ${record.kind}`.toLowerCase().includes(normalized));
  }, [input]);
  const selectedFile = selectedRecord?.kind === "file" ? SYNTH_CODE_FILES.find((file) => selectedRecord.id === `file:${file.path}`) : undefined;
  const selectedDocument = selectedRecord?.kind === "document" ? SYNTH_DOCUMENTS.find((doc) => selectedRecord.id === `document:${doc.id}`) : undefined;
  const engine = useEngineAction({ project, context });

  const runSearch = async (nextQuery = input) => {
    const normalized = nextQuery.trim();
    setInput(normalized);
    setSelectedRecord(null);
    if (!normalized || engine.state === "loading") return;
    setRecentSearches((current) => [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5));
    const action: ModuleAction = { id: "run-search", label: `Search SYNTH for ${normalized}`, intent: "research", payload: { query: normalized } };
    onAction?.(action);
    await engine.runAction(action);
  };

  const selectResult = async (record: SearchRecord) => {
    setSelectedRecord(record);
    const action: ModuleAction = { id: "select-search-result", label: `Opened ${record.title}`, intent: "research", payload: { recordId: record.id, source: record.source, excerpt: record.excerpt } };
    onAction?.(action);
    await engine.runAction(action);
  };

  return (
    <div className="space-y-4">
      <Card className="border-synth-cyan/20 bg-synth-cyan/5"><CardContent className="p-4"><form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void runSearch(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search files, docs, memory..." aria-label="Search SYNTH workspace context" className="h-10" /><Button type="submit" disabled={engine.state === "loading"} className="h-10 bg-synth-cyan text-slate-950 hover:bg-synth-cyan/85">{engine.state === "loading" ? "Searching…" : "Search"}</Button></form><p className="mt-2 text-xs leading-5 text-muted-foreground">Local indexed search runs first. Future web sources will remain separate from this provider-neutral research boundary.</p></CardContent></Card>
      <SearchResults query={input} results={results} recentSearches={recentSearches} onRecentSelect={(recent) => void runSearch(recent)} onSelectResult={(record) => void selectResult(record)} />
      <ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} />
      {selectedRecord && (
        <div className="space-y-4">
          <Card className="border-synth-cyan/20 bg-synth-cyan/5">
            <CardHeader className="border-b border-border/70 pb-4"><CardTitle className="text-sm">Selected search result</CardTitle></CardHeader>
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{selectedRecord.source}</p>
              <p className="text-sm font-semibold text-foreground">{selectedRecord.title}</p>
              <p className="text-xs leading-5 text-muted-foreground">{selectedRecord.excerpt}</p>
              {selectedDocument ? (
                <MarkdownViewer document={selectedDocument} />
              ) : selectedFile ? (
                <div className="rounded-lg border border-border bg-background/70 p-3 font-mono text-[10px] leading-6 text-foreground"><pre className="overflow-x-auto whitespace-pre-wrap">{selectedFile.content.split("\n").slice(0, 10).join("\n")}</pre></div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
