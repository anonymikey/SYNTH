import type { MemoryQuery, MemoryRecord, MemoryResult } from "@/memory/types";

const records: MemoryRecord[] = [];

export const mockMemoryRepository = {
  async retrieve(query: MemoryQuery): Promise<MemoryResult[]> {
    return records.filter((record) => record.scope === query.scope).slice(0, query.limit ?? 8);
  },
  async record(record: MemoryRecord) { records.push(record); },
};
