import type { MemoryService } from "@/memory/types";

export function createLongTermMemory(service: MemoryService) {
  void service;
  return { scope: "long-term" as const };
}
