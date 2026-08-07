"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SearchResults } from "@/components/modules/search-results";
import { SYNTH_SEARCH_RECORDS } from "@/components/modules/mock-data";
import type { SearchRecord, WorkspaceModuleProps } from "@/components/modules/types";

export function SearchModule({ onAction }: WorkspaceModuleProps) {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return SYNTH_SEARCH_RECORDS.filter((record) => `${record.title} ${record.excerpt} ${record.source}`.toLowerCase().includes(normalized));
  }, [query]);

  const runSearch = (nextQuery = input) => {
    const normalized = nextQuery.trim();
    setInput(normalized);
    setQuery(normalized);
    if (!normalized) return;
    setRecentSearches((current) => [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5));
    onAction?.({ id: "run-search", label: `Search SYNTH for ${normalized}`, intent: "research", payload: { query: normalized } });
  };

  const selectResult = (record: SearchRecord) => onAction?.({ id: "select-search-result", label: `Opened ${record.title}`, intent: "research", payload: { recordId: record.id, source: record.source } });

  return (
    <div className="space-y-4">
      <Card className="border-synth-cyan/20 bg-synth-cyan/5"><CardContent className="p-4"><form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); runSearch(); }}><Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search files, docs, memory..." aria-label="Search SYNTH workspace context" className="h-10" /><Button type="submit" className="h-10 bg-synth-cyan text-slate-950 hover:bg-synth-cyan/85">Search</Button></form><p className="mt-2 text-xs leading-5 text-muted-foreground">Unified local search is interactive now; indexed provider and web sources can attach behind the Engine boundary later.</p></CardContent></Card>
      <SearchResults query={query} results={results} recentSearches={recentSearches} onRecentSelect={runSearch} onSelectResult={selectResult} />
    </div>
  );
}
