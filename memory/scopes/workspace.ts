import type { MemoryService } from "@/memory/types";

export function createWorkspaceMemory(service: MemoryService) {
  void service;
  return { scope: "workspace" as const };
}
