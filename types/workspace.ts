import type { ProviderId } from "@/lib/ai/types";

export type AgentMode = "assistant" | "architect" | "researcher" | "reviewer";
export type WorkspaceSyncState = "synced" | "dirty" | "offline";
export type RecentFileKind = "code" | "style" | "config" | "doc";

export interface ProjectSummary {
  id: string;
  name: string;
  branch: string;
  language: string;
  framework: string;
  fileCount: number;
  version: string;
  syncState: WorkspaceSyncState;
}

export interface RecentFile {
  path: string;
  kind: RecentFileKind;
  updatedAt: string;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  pinned: boolean;
}

export interface ChatContextView {
  projectId: string;
  recentFiles: RecentFile[];
  knowledge: KnowledgeItem[];
  selectedFile?: string;
}

export interface ModelInfoView {
  id: string;
  label: string;
  providerId: ProviderId;
  contextWindow?: number;
}
