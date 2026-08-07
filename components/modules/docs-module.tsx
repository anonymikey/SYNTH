"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DocsList } from "@/components/modules/docs-list";
import { MarkdownViewer } from "@/components/modules/markdown-viewer";
import { ModuleEmpty } from "@/components/modules/module-states";
import { SummaryPlaceholder } from "@/components/modules/summary-placeholder";
import { SYNTH_DOCUMENTS } from "@/components/modules/mock-data";
import type { WorkspaceModuleProps } from "@/components/modules/types";

type SummaryState = "idle" | "loading" | "ready";

export function DocsModule({ onAction }: WorkspaceModuleProps) {
  const [selectedId, setSelectedId] = useState(SYNTH_DOCUMENTS[0]?.id);
  const [summaryState, setSummaryState] = useState<SummaryState>("idle");
  const [summary, setSummary] = useState("");
  const timerRef = useRef<number | undefined>(undefined);
  const selectedDocument = SYNTH_DOCUMENTS.find((document) => document.id === selectedId);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const selectDocument = (id: string) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setSelectedId(id);
    setSummaryState("idle");
    setSummary("");
    const document = SYNTH_DOCUMENTS.find((item) => item.id === id);
    if (document) onAction?.({ id: "select-document", label: `Selected ${document.title}`, intent: "research", payload: { documentId: id } });
  };

  const summarize = () => {
    if (!selectedDocument) return;
    setSummaryState("loading");
    onAction?.({ id: "summarize-document", label: `Summarize ${selectedDocument.title}`, intent: "research", payload: { documentId: selectedDocument.id } });
    timerRef.current = window.setTimeout(() => {
      setSummary(`Local summary placeholder: ${selectedDocument.summary} The full summary will be generated through the SYNTH Engine research intent when that capability is connected.`);
      setSummaryState("ready");
    }, 450);
  };

  if (!SYNTH_DOCUMENTS.length) return <ModuleEmpty title="No documents available" description="Pinned SYNTH knowledge will appear here once a repository is connected." />;

  return (
    <div className="space-y-4">
      <Card className="border-synth-violet/20 bg-synth-violet/5"><CardContent className="p-4 text-xs leading-5 text-muted-foreground">Browse pinned knowledge and local workspace documents. Document selection and summary requests are ready for the future SYNTH research capability.</CardContent></Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"><DocsList documents={SYNTH_DOCUMENTS} selectedId={selectedId} onSelect={selectDocument} /><div className="min-w-0 space-y-4"><MarkdownViewer document={selectedDocument} /><SummaryPlaceholder state={summaryState} summary={summary} onSummarize={summarize} /></div></div>
    </div>
  );
}
