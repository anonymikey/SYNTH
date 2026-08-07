import type { MemoryScope } from "@/engine/types";

export interface MemoryQuery {
  scope: MemoryScope;
  projectId?: string;
  conversationId?: string;
  query?: string;
  limit?: number;
}

export interface MemoryRecord {
  id: string;
  scope: MemoryScope;
  content: string;
  metadata: Record<string, string>;
  createdAt: string;
}

export interface MemoryResult extends MemoryRecord {
  score?: number;
}

export interface MemoryService {
  retrieve(query: MemoryQuery): Promise<MemoryResult[]>;
  record(record: MemoryRecord): Promise<void>;
}
