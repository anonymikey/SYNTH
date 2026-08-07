import type { KnowledgePort, MemoryPort } from "@/engine/ports";
import type { EngineContext } from "@/engine/types";

export interface AssembledContext {
  memory: Array<{ content: string; scope: string }>;
  knowledge: Array<{ title: string; content: string }>;
  files: NonNullable<EngineContext["recentFiles"]>;
}

export async function assembleContext(context: EngineContext | undefined, query: string, dependencies: { memory: MemoryPort; knowledge: KnowledgePort }): Promise<AssembledContext> {
  const memoryScopes = context?.memoryScopes ?? ["conversation", "workspace", "project"];
  const memoryResults = (await Promise.all(memoryScopes.map((scope) => dependencies.memory.retrieve({ scope, projectId: context?.projectId, query, limit: 3 })))).flat();
  const knowledgeResults = context?.knowledgeIds?.length ? await dependencies.knowledge.search({ projectId: context.projectId, query, limit: 4 }) : [];
  return { memory: memoryResults.map((item) => ({ content: item.content, scope: item.scope })), knowledge: knowledgeResults.map((item) => ({ title: item.document.title, content: item.chunk.content })), files: context?.recentFiles ?? [] };
}
