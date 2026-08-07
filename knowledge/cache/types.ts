export interface KnowledgeCacheKey {
  namespace: "knowledge" | "embedding" | "search";
  value: string;
}

export interface KnowledgeCachePolicy {
  ttlSeconds: number;
  staleWhileRevalidate: boolean;
}
