import { SUGGESTED_PROMPTS } from "@/modules/assistant/constants";

export const mockAssistantRepository = {
  async listSuggestions() { return SUGGESTED_PROMPTS; },
};
