import type { ContextSource } from "@/modules/memory/types";

export function ContextSources({ sources }: { sources: ContextSource[] }) {
  return <ul className="space-y-1 text-xs text-muted-foreground">{sources.map((source) => <li key={source.id}>{source.label}</li>)}</ul>;
}
