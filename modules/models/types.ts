import type { ModelInfo } from "@/lib/ai/types";

export interface ModelRepository {
  listAvailable(): Promise<ModelInfo[]>;
}
