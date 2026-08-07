export interface MemorySummary {
  id: string;
  scope: "conversation" | "workspace" | "project" | "long-term";
  label: string;
  value: string;
}

export interface ContextSource {
  id: string;
  kind: "file" | "knowledge" | "memory" | "project";
  label: string;
  excerpt?: string;
}
