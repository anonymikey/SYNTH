import type { KnowledgeItem } from "@/types/workspace";

export interface KnowledgeRepository {
  listPinned(projectId: string): Promise<KnowledgeItem[]>;
}
