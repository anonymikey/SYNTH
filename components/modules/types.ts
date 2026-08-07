import type { EngineIntent } from "@/engine/types";
import type { ChatContextView, ProjectSummary, RecentFileKind } from "@/types/workspace";
import type { SynthModuleId } from "@/lib/config/modules";

export type WorkspaceModuleId = Exclude<SynthModuleId, "assistant" | "agent">;
export type ModuleState = "ready" | "loading" | "empty" | "error" | "coming-soon";
export type ModuleActionId =
  | "select-file"
  | "run-code-action"
  | "select-document"
  | "summarize-document"
  | "run-search"
  | "select-search-result"
  | "stage-vision-image"
  | "remove-vision-image"
  | "request-vision-analysis";

export type ModuleActionIntent = Extract<EngineIntent, "coding" | "research" | "vision">;

export interface ModuleAction {
  id: ModuleActionId;
  label: string;
  intent: ModuleActionIntent;
  payload?: Record<string, string>;
}

export interface WorkspaceModuleProps {
  project: ProjectSummary;
  context: ChatContextView;
  onAction?: (action: ModuleAction) => void;
}

export interface CodeFile {
  path: string;
  kind: RecentFileKind;
  language: string;
  content: string;
  updatedAt: string;
}

export interface SynthDocument {
  id: string;
  title: string;
  summary: string;
  markdown: string;
  updatedAt: string;
}

export interface SearchRecord {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  kind: "file" | "document" | "memory";
}

export interface VisionAsset {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  previewUrl: string;
}

export interface ModuleRouterProps extends WorkspaceModuleProps {
  destination: WorkspaceModuleId;
  onBackToAssistant: () => void;
}
