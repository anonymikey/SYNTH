import type { MemoryQuery, MemoryRecord, MemoryResult, MemoryService } from "@/memory/types";

export function createMemoryService(): MemoryService {
  const records: MemoryRecord[] = [];
  return {
    async retrieve(query: MemoryQuery): Promise<MemoryResult[]> {
      return records.filter((record) => record.scope === query.scope).slice(0, query.limit ?? 8);
    },
    async record(record: MemoryRecord) {
      records.push(record);
    },
  };
}
