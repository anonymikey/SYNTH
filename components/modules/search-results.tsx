"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { iconFor } from "@/lib/icons";
import { formatSearchCount } from "@/components/modules/formatters";
import type { SearchRecord } from "@/components/modules/types";

export function SearchResults({ query, results, recentSearches, onRecentSelect, onSelectResult }: { query: string; results: SearchRecord[]; recentSearches: string[]; onRecentSelect: (query: string) => void; onSelectResult: (record: SearchRecord) => void }) {
  const SearchIcon = iconFor("search");
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <Card className="min-w-0">
        <CardHeader className="border-b border-border/70 pb-4"><div className="flex items-center justify-between gap-2"><CardTitle className="text-sm">Indexed workspace context</CardTitle><Badge variant="outline" className="border-synth-cyan/25 text-[9px] text-synth-cyan">local index</Badge></div><p className="text-xs text-muted-foreground" aria-live="polite">{query ? formatSearchCount(results.length) : "Enter a query to search local files, docs, and memory."}</p></CardHeader>
        <CardContent className="space-y-2 p-3">
          {!query && <div className="rounded-lg border border-dashed border-border p-8 text-center"><SearchIcon className="mx-auto size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Search local context</p><p className="mt-1 text-xs leading-5 text-muted-foreground">SYNTH Search is ready for a unified workspace index.</p></div>}
          {query && results.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No matching results found. Try a file name, capability, or project concept.</div>}
          {query && results.map((record) => { const ResultIcon = iconFor(record.kind === "file" ? "fileCode" : record.kind === "document" ? "fileText" : "brain"); return <Button key={record.id} type="button" variant="ghost" className="h-auto min-h-16 w-full justify-start gap-3 border border-border/70 bg-muted/15 px-3 py-3 text-left hover:border-synth-cyan/30" onClick={() => onSelectResult(record)}><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan"><ResultIcon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-foreground">{record.title}</span><span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{record.excerpt}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground/70">{record.source}</span></span></Button>; })}
        </CardContent>
      </Card>
      <Card className="h-fit"><CardHeader className="border-b border-border/70 pb-4"><CardTitle className="text-sm">Recent searches</CardTitle></CardHeader><CardContent className="space-y-2 p-3">{recentSearches.length ? recentSearches.map((recent) => <Button key={recent} type="button" variant="ghost" className="h-auto min-h-10 w-full justify-start gap-2 px-2 text-left text-xs text-muted-foreground" onClick={() => onRecentSelect(recent)}><SearchIcon className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{recent}</span></Button>) : <p className="p-2 text-xs leading-5 text-muted-foreground">Your recent local searches will appear here.</p>}</CardContent></Card>
    </div>
  );
}
