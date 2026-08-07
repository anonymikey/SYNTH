import type { KnowledgeQuery, KnowledgeResult } from "@/knowledge/types";

export interface SearchIndexPort {
  search(query: KnowledgeQuery): Promise<KnowledgeResult[]>;
}
