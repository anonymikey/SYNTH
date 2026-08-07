import { DEFAULT_CONTEXT, DEFAULT_PROJECT } from "@/lib/config/workspace";
import type { CodeFile, SearchRecord, SynthDocument } from "@/components/modules/types";

export const SYNTH_CODE_FILES: CodeFile[] = [
  {
    path: "engine/synth-engine.ts",
    kind: "code",
    language: "typescript",
    updatedAt: "2m",
    content: `import type { EngineEvent, EngineRequest, SynthEngine } from "@/engine/types";

export function createSynthEngine(): SynthEngine {
  return {
    async *run(request: EngineRequest): AsyncIterable<EngineEvent> {
      yield { type: "request-start", requestId: request.requestId };
      // Provider-neutral orchestration stays behind this boundary.
    },
  };
}`,
  },
  {
    path: "components/assistant/assistant-workspace.tsx",
    kind: "code",
    language: "tsx",
    updatedAt: "now",
    content: `export function AssistantWorkspace() {
  const chat = useAssistantChat({ project, context, modelId, agentMode });

  return (
    <PromptComposer
      onSubmit={send}
      isStreaming={chat.isStreaming}
    />
  );
}`,
  },
  {
    path: "lib/ai/types.ts",
    kind: "code",
    language: "typescript",
    updatedAt: "4m",
    content: `export interface AIProvider {
  readonly id: ProviderId;
  streamChat(request: ProviderChatRequest): AsyncIterable<ProviderEvent>;
  health(): Promise<ProviderHealth>;
}`,
  },
  {
    path: "app/globals.css",
    kind: "style",
    language: "css",
    updatedAt: "8m",
    content: `@utility synth-grid {
  background-image: linear-gradient(
    to right,
    color-mix(in srgb, var(--synth-cyan) 5%, transparent) 1px,
    transparent 1px
  );
  background-size: 42px 42px;
}`,
  },
];

export const SYNTH_DOCUMENTS: SynthDocument[] = [
  {
    id: DEFAULT_CONTEXT.knowledge[0]?.id ?? "provider-contract",
    title: DEFAULT_CONTEXT.knowledge[0]?.title ?? "Provider interface contract",
    summary: DEFAULT_CONTEXT.knowledge[0]?.summary ?? "Provider-neutral boundaries for AI services.",
    updatedAt: "today",
    markdown: `# Provider interface contract

SYNTH keeps the interface between the workspace and AI providers explicit.

- The UI sends requests through the SYNTH Engine boundary.
- Providers stream normalized events back to the engine.
- Local-first behavior remains available when a remote service is unavailable.`,
  },
  {
    id: DEFAULT_CONTEXT.knowledge[1]?.id ?? "product-principles",
    title: DEFAULT_CONTEXT.knowledge[1]?.title ?? "SYNTH product principles",
    summary: DEFAULT_CONTEXT.knowledge[1]?.summary ?? "Fast, explainable, modular, and respectful of local context.",
    updatedAt: "yesterday",
    markdown: `# SYNTH product principles

SYNTH is a focused workspace for building with AI without giving up project context.

## Principles

- Fast: keep common actions close to the active work.
- Explainable: make state, sources, and provider status visible.
- Modular: add capability layers without coupling the UI to providers.
- Local-first: keep workspace context available when services change.`,
  },
  {
    id: "workspace-map",
    title: "Workspace architecture map",
    summary: "A quick reference for the engine, modules, ports, and repositories.",
    updatedAt: "3d",
    markdown: `# Workspace architecture map

The app shell owns navigation and layout. Domain modules own feature state. The SYNTH Engine owns orchestration.

Use module action payloads as the seam for future engine requests; do not call provider implementations from the UI.`,
  },
];

export const SYNTH_SEARCH_RECORDS: SearchRecord[] = [
  ...SYNTH_CODE_FILES.slice(0, 3).map((file) => ({
    id: `file:${file.path}`,
    title: file.path,
    excerpt: `${file.language} source in the ${DEFAULT_PROJECT.name} repository. Updated ${file.updatedAt}.`,
    source: "Local repository",
    kind: "file" as const,
  })),
  ...SYNTH_DOCUMENTS.map((document) => ({
    id: `document:${document.id}`,
    title: document.title,
    excerpt: document.summary,
    source: "Pinned knowledge",
    kind: "document" as const,
  })),
  {
    id: "memory:engine-boundary",
    title: "Engine boundary decision",
    excerpt: "Keep provider selection, streaming, and context assembly behind SynthEngine.run.",
    source: "Workspace memory",
    kind: "memory" as const,
  },
];
