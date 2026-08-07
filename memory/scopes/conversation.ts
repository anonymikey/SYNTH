import type { MemoryService } from "@/memory/types";

export function createConversationMemory(service: MemoryService) {
  void service;
  return { scope: "conversation" as const };
}
