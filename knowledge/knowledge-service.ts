import type { KnowledgeQuery, KnowledgeResult } from "@/knowledge/types";

export interface KnowledgeService {
  search(query: KnowledgeQuery): Promise<KnowledgeResult[]>;
}

export function createKnowledgeService(): KnowledgeService {
  return {
    async search() {
      return [];
    },
  };
}
