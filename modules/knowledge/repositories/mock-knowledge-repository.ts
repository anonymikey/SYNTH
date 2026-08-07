import { DEFAULT_CONTEXT } from "@/lib/config/workspace";
import type { KnowledgeRepository } from "@/modules/knowledge/types";

export const mockKnowledgeRepository: KnowledgeRepository = {
  async listPinned() { return DEFAULT_CONTEXT.knowledge; },
};
