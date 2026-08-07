import { Card, CardContent } from "@/components/ui/card";
import type { KnowledgeItem } from "@/types/workspace";

export function PinnedKnowledge({ items }: { items: KnowledgeItem[] }) {
  return <div className="space-y-2">{items.filter((item) => item.pinned).map((item) => <Card key={item.id}><CardContent className="p-3"><p className="text-xs font-medium">{item.title}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.summary}</p></CardContent></Card>)}</div>;
}
