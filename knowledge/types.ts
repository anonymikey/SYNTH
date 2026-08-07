export type KnowledgeSourceKind = "documentation" | "markdown" | "pdf" | "json";

export interface KnowledgeDocument {
  id: string;
  source: KnowledgeSourceKind;
  title: string;
  uri?: string;
  metadata: Record<string, string>;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
}

export interface KnowledgeQuery {
  projectId?: string;
  query: string;
  limit?: number;
}

export interface KnowledgeResult {
  chunk: KnowledgeChunk;
  document: KnowledgeDocument;
  score?: number;
}
