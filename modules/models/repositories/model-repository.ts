import { mockModels } from "@/mocks/models";
import type { ModelRepository } from "@/modules/models/types";

export const mockModelRepository: ModelRepository = {
  async listAvailable() { return mockModels; },
};
