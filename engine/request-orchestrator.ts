import type { EngineRequest } from "@/engine/types";

export function normalizeEngineRequest(request: EngineRequest): EngineRequest {
  return { ...request, requestId: request.requestId || crypto.randomUUID(), messages: request.messages.slice(-32) };
}
