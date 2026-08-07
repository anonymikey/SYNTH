import type { ChatContextView, ProjectSummary, RecentFile } from "@/types/workspace";

export const DEFAULT_PROJECT: ProjectSummary = {
  id: "synth-platform",
  name: "SYNTH Platform",
  branch: "main",
  language: "TypeScript",
  framework: "Next.js App Router",
  fileCount: 18,
  version: "v0.1.0",
  syncState: "synced",
};

export const DEFAULT_RECENT_FILES: RecentFile[] = [
  { path: "src/assistant/AssistantShell.tsx", kind: "code", updatedAt: "now" },
  { path: "src/engine/synth-engine.ts", kind: "code", updatedAt: "2m" },
  { path: "src/lib/ai/types.ts", kind: "code", updatedAt: "4m" },
  { path: "src/app/globals.css", kind: "style", updatedAt: "8m" },
];

export const DEFAULT_CONTEXT: ChatContextView = {
  projectId: DEFAULT_PROJECT.id,
  recentFiles: DEFAULT_RECENT_FILES,
  knowledge: [
    { id: "provider-contract", title: "Provider interface contract", summary: "Keep UI independent from Ollama, OpenAI, Anthropic, Gemini, and custom adapters.", pinned: true },
    { id: "product-principles", title: "SYNTH product principles", summary: "Fast, explainable, modular, and respectful of local project context.", pinned: true },
  ],
};
