import type { MemoryService } from "@/memory/types";

export function createProjectMemory(service: MemoryService) {
  void service;
  return { scope: "project" as const };
}
