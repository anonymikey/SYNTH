import type { ToolDefinition } from "@/tools/types";

const definitions = new Map<string, ToolDefinition>();

export const ToolRegistry = {
  register(definition: ToolDefinition) {
    definitions.set(definition.id, definition);
  },
  get(id: string) {
    return definitions.get(id);
  },
  list() {
    return [...definitions.values()];
  },
};
