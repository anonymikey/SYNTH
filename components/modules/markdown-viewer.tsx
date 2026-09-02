import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SynthDocument } from "@/components/modules/types";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

export function MarkdownViewer({ document }: { document?: SynthDocument }) {
  if (!document) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a document to view it.</CardContent></Card>;

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b border-border/70 pb-4"><CardTitle className="text-sm">Markdown viewer</CardTitle><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{document.title} · updated {document.updatedAt}</p></CardHeader>
      <CardContent className="max-w-none p-5">
        <MarkdownRenderer content={document.markdown} variant="assistant" />
      </CardContent>
    </Card>
  );
}
