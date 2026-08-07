import type { EngineRequest } from "@/engine/types";

export interface ReasoningPlan {
  steps: string[];
  enabled: boolean;
}

export function createReasoningPlan(request: EngineRequest): ReasoningPlan {
  void request;
  return { steps: ["single-pass-response"], enabled: false };
}
