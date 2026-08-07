import type { AIProvider, ProviderSelection } from "@/lib/ai/types";
import type { AgentDefinition } from "@/agents/types";
import type { KnowledgeQuery, KnowledgeResult } from "@/knowledge/types";
import type { MemoryQuery, MemoryRecord, MemoryResult } from "@/memory/types";
import type { SkillDefinition } from "@/skills/types";
import type { ToolCall, ToolContext, ToolDefinition, ToolResult } from "@/tools/types";
import type { EngineIntent } from "@/engine/types";
import type { AgentMode } from "@/types/workspace";

export interface ProviderPort {
  resolve(selection: ProviderSelection): Promise<AIProvider>;
}

export interface MemoryPort {
  retrieve(query: MemoryQuery): Promise<MemoryResult[]>;
  record?(record: MemoryRecord): Promise<void>;
}

export interface KnowledgePort {
  search(query: KnowledgeQuery): Promise<KnowledgeResult[]>;
}

export interface ToolPort {
  listAvailable(context: ToolContext): Promise<ToolDefinition[]>;
  execute(call: ToolCall, context: ToolContext): Promise<ToolResult>;
}

export interface SkillPort {
  resolve(ids: string[]): Promise<SkillDefinition[]>;
}

export interface AgentPort {
  resolve(intent: EngineIntent, mode: AgentMode): Promise<AgentDefinition | undefined>;
}
