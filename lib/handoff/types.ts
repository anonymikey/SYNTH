import type { ProjectSummary } from "@/types/workspace";

export type CapabilityIntent =
  | "general_chat"
  | "capability_question"
  | "image_analysis"
  | "image_generation"
  | "website_building"
  | "application_building"
  | "system_building"
  | "code_completion"
  | "bug_fixing"
  | "refactoring"
  | "code_review"
  | "repository_work"
  | "multi_agent_task"
  | "research"
  | "document_task"
  | "mcp_task"
  | "plugin_task";

export type CapabilityDestination =
  | "assistant"
  | "vision"
  | "code"
  | "agent"
  | "docs"
  | "search"
  | "imports"
  | "mcp"
  | "plugins";

export interface SynthHandoffAttachment {
  id: string;
  name: string;
  kind: "image" | "file";
  size: number;
  mimeType?: string;
  url?: string;      // Blob/preview URL for display
  dataUrl?: string;  // Base64 data URL for API/persistence
}

export interface SynthHandoff {
  id: string;
  source: "assistant";
  destination: CapabilityDestination;
  intent: CapabilityIntent;
  userRequest: string;
  suggestedTask: string;
  attachments: SynthHandoffAttachment[];
  projectId?: string;
  projectName?: string;
  selectedFile?: string;
  branch?: string;
  conversationContext?: string;
  agentSequence?: string[];
  createdAt: string;
}

export interface SynthRecommendation {
  id: string;
  destination: CapabilityDestination;
  intent: CapabilityIntent;
  title: string;
  description: string;
  badge?: string;
  actionLabel: string;
  secondaryActionLabel?: string;
  handoff: SynthHandoff;
  agentSequence?: string[];
}

export interface CapabilityIntentInput {
  userMessage: string;
  attachments?: SynthHandoffAttachment[];
  project?: ProjectSummary | null;
  selectedFile?: string | null;
  conversationContext?: string;
}

export interface CapabilityIntentResult {
  intent: CapabilityIntent;
  destination: CapabilityDestination;
  confidence: number;
  needsHandoff: boolean;
  title: string;
  description: string;
  actionLabel: string;
  suggestedTask: string;
  agentSequence?: string[];
  assistantResponseHint?: string;
  reasons: string[];
}
