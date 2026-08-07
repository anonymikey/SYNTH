import type { EngineIntent, EngineRequest } from "@/engine/types";

export function routeIntent(request: EngineRequest): EngineIntent {
  if (request.mode === "architect") return "planning";
  if (request.mode === "researcher") return "research";
  if (request.mode === "reviewer") return "review";
  return "conversation";
}
