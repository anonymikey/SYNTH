import { DEFAULT_PROJECT, DEFAULT_RECENT_FILES } from "@/lib/config/workspace";
import type { ProjectRepository } from "@/modules/projects/types";

export const mockProjectRepository: ProjectRepository = {
  async getCurrent() { return DEFAULT_PROJECT; },
  async listRecentFiles() { return DEFAULT_RECENT_FILES; },
};
