import type { ProjectSummary, RecentFile } from "@/types/workspace";

export interface ProjectRepository {
  getCurrent(): Promise<ProjectSummary>;
  listRecentFiles(projectId: string): Promise<RecentFile[]>;
}
