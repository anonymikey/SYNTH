/**
 * DemoRepositoryAdapter — fallback when local project access is unavailable.
 * Uses the existing SYNTH_CODE_FILES mock data as demo fixtures.
 * Clearly labels itself as a "Demo Project" in the UI.
 */

import type {
  ProjectAdapterType,
  ProjectFileContent,
  ProjectFileEntry,
  ProjectInfo,
  ProjectSearchResult,
  RepositoryAdapter,
} from "@/lib/project/types";
import { MAX_SEARCH_RESULTS } from "@/lib/project/file-safety";
import { SYNTH_CODE_FILES } from "@/components/modules/mock-data";

const DEMO_PROJECT: ProjectInfo = {
  id: "synth-demo",
  name: "SYNTH Platform (Demo)",
  adapterType: "demo",
  language: "TypeScript",
  framework: "Next.js App Router",
  fileCount: SYNTH_CODE_FILES.length,
  version: "v0.1.0",
  readOnly: true,
};

/** Convert mock data to ProjectFileEntry format */
function mockFileToEntry(file: (typeof SYNTH_CODE_FILES)[number]): ProjectFileEntry {
  return {
    path: file.path,
    isDirectory: false,
    extension: file.path.split(".").pop() ?? "",
    size: file.content.length,
    updatedAt: file.updatedAt,
  };
}

export function createDemoAdapter(): RepositoryAdapter {
  const entries = SYNTH_CODE_FILES.map(mockFileToEntry);

  return {
    type: "demo" as ProjectAdapterType,

    async getProject(): Promise<ProjectInfo> {
      return { ...DEMO_PROJECT };
    },

    async listFiles(): Promise<ProjectFileEntry[]> {
      return entries;
    },

    async readFile(relativePath: string): Promise<ProjectFileContent> {
      const file = SYNTH_CODE_FILES.find((f) => f.path === relativePath);
      if (!file) throw new Error(`File not found in demo: ${relativePath}`);

      const lines = file.content.split("\n");
      return {
        path: file.path,
        content: file.content,
        language: file.language,
        lineCount: lines.length,
        byteSize: file.content.length,
      };
    },

    async searchFiles(query: string, maxResults = MAX_SEARCH_RESULTS): Promise<ProjectSearchResult[]> {
      if (!query.trim()) return [];
      const lower = query.toLowerCase();
      const results: ProjectSearchResult[] = [];

      for (const file of SYNTH_CODE_FILES) {
        // Filename match
        if (file.path.toLowerCase().includes(lower)) {
          results.push({ path: file.path, snippet: `File: ${file.path}` });
          continue;
        }

        // Content match
        const lines = file.content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(lower)) {
            results.push({
              path: file.path,
              line: i + 1,
              snippet: lines[i].trim().slice(0, 120),
            });
            if (results.length >= maxResults) break;
          }
        }
        if (results.length >= maxResults) break;
      }

      return results.slice(0, maxResults);
    },

    async getAllFilePaths(): Promise<string[]> {
      return entries.map((e) => e.path);
    },
  };
}
