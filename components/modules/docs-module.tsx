"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DocsList } from "@/components/modules/docs-list";
import { MarkdownViewer } from "@/components/modules/markdown-viewer";
import { ModuleEmpty } from "@/components/modules/module-states";
import { SummaryPlaceholder } from "@/components/modules/summary-placeholder";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { SYNTH_DOCUMENTS } from "@/components/modules/mock-data";
import type { ModuleAction, WorkspaceModuleProps } from "@/components/modules/types";

type SummaryState = "idle" | "loading" | "ready";

export function DocsModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [selectedId, setSelectedId] = useState(SYNTH_DOCUMENTS[0]?.id);
  const [summary, setSummary] = useState("");
  const selectedDocument = SYNTH_DOCUMENTS.find((document) => document.id === selectedId);
  const engine = useEngineAction({ project, context });
  const summaryState: SummaryState = engine.state === "loading" ? "loading" : engine.state === "success" ? "ready" : "idle";

  const selectDocument = (id: string) => {
    setSelectedId(id);
    setSummary("");
    const document = SYNTH_DOCUMENTS.find((item) => item.id === id);
    if (document) onAction?.({ id: "select-document", label: `Selected ${document.title}`, intent: "research", payload: { documentId: id } });
  };

  const summarize = async () => {
    if (!selectedDocument || engine.state === "loading") return;
    const action: ModuleAction = { id: "summarize-document", label: `Summarize ${selectedDocument.title}`, intent: "research", payload: { documentId: selectedDocument.id, content: selectedDocument.markdown } };
    onAction?.(action);
    const result = await engine.runAction(action);
    if (result.state === "success") setSummary(result.output);
  };

  if (!SYNTH_DOCUMENTS.length) return <ModuleEmpty title="No documents available" description="Pinned SYNTH knowledge will appear here once a repository is connected." />;

  return (
    <div className="space-y-4">
      <Card className="border-synth-violet/20 bg-synth-violet/5"><CardContent className="p-4 text-xs leading-5 text-muted-foreground">Browse pinned knowledge and local workspace documents. Document selection and summary requests are ready for the future SYNTH research capability.</CardContent></Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"><DocsList documents={SYNTH_DOCUMENTS} selectedId={selectedId} onSelect={selectDocument} /><div className="min-w-0 space-y-4"><MarkdownViewer document={selectedDocument} /><SummaryPlaceholder state={summaryState} summary={summary} disabled={engine.state === "loading"} onSummarize={summarize} /><ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} /></div></div>
    </div>
  );
}
