import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SynthDocument } from "@/components/modules/types";

export function MarkdownViewer({ document }: { document?: SynthDocument }) {
  if (!document) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Select a document to view it.</CardContent></Card>;

  const blocks = document.markdown.split("\n");
  return (
    <Card className="min-w-0">
      <CardHeader className="border-b border-border/70 pb-4"><CardTitle className="text-sm">Markdown viewer</CardTitle><p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">{document.title} · updated {document.updatedAt}</p></CardHeader>
      <CardContent className="prose prose-invert max-w-none space-y-3 p-5 text-sm leading-7 text-foreground/85">
        {blocks.map((block, index) => {
          if (block.startsWith("# ")) return <h2 key={index} className="font-heading text-xl font-bold tracking-[-0.03em] text-foreground">{block.slice(2)}</h2>;
          if (block.startsWith("## ")) return <h3 key={index} className="font-heading text-base font-semibold text-foreground">{block.slice(3)}</h3>;
          if (block.startsWith("- ")) return <p key={index} className="pl-4 before:mr-2 before:text-synth-cyan before:content-['•']">{block.slice(2)}</p>;
          if (!block.trim()) return <div key={index} className="h-1" aria-hidden="true" />;
          return <p key={index}>{block}</p>;
        })}
      </CardContent>
    </Card>
  );
}
