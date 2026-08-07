import type { ToolCall, ToolDefinition } from "@/tools/types";

export interface ToolPermissionPolicy {
  canExecute(definition: ToolDefinition, call: ToolCall): boolean;
  requiresConfirmation(definition: ToolDefinition): boolean;
}

export const phaseOneToolPolicy: ToolPermissionPolicy = {
  canExecute: () => false,
  requiresConfirmation: () => true,
};
