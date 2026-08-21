/**
 * LocalRepositoryAdapter — reads the actual SYNTH project from the local filesystem.
 * Runs server-side only. Never exposes filesystem paths to the browser.
 *
 * Security:
 * - All paths are normalized and validated against the project root
 * - Denylist blocks secret files (.env, .pem, credentials, etc.)
 * - Binary files are rejected from text reading
 * - File size limits enforced
 * - Path traversal prevented
 */

import * as fs from "fs";
import * as path from "path";
import type {
  ProjectAdapterType,
  ProjectFileContent,
  ProjectFileEntry,
  ProjectInfo,
  ProjectSearchResult,
  RepositoryAdapter,
} from "@/lib/project/types";
import {
  isBinaryExtension,
  isDeniedPath,
  languageForPath,
  MAX_CONTEXT_SIZE,
  MAX_FILE_SIZE,
  MAX_SEARCH_RESULTS,
  normalizePath,
  validatePath,
} from "@/lib/project/file-safety";

const PROJECT_ROOT = process.cwd();

const LOCAL_PROJECT: ProjectInfo = {
  id: "synth-local",
  name: "SYNTH Platform",
  adapterType: "local",
  language: "TypeScript",
  framework: "Next.js App Router",
  fileCount: 0, // updated at runtime
  version: "v0.1.0",
  readOnly: true,
};

/** Directories to skip when listing */
const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  ".turbo",
  ".vercel",
]);

/** Extensions to include when counting files */
const TEXT_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "css", "scss", "html", "json",
  "md", "mdx", "py", "yml", "yaml", "toml", "xml", "sh",
  "bash", "sql", "graphql", "env", "txt", "plain",
]);

function getExtension(filePath: string): string {
  return filePath.split(".").pop()?.toLowerCase() ?? "";
}

function isTextFile(filePath: string): boolean {
  const ext = getExtension(filePath);
  if (isDeniedPath(filePath)) return false;
  if (isBinaryExtension(ext)) return false;
  return TEXT_EXTENSIONS.has(ext) || ext === "";
}

function listDirectory(dirPath: string, basePath: string): ProjectFileEntry[] {
  const entries: ProjectFileEntry[] = [];

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (SKIP_DIRS.has(item.name)) continue;
      if (item.name.startsWith(".")) continue; // skip hidden files/dirs

      const relativePath = basePath ? `${basePath}/${item.name}` : item.name;

      // Check denylist
      if (isDeniedPath(relativePath)) continue;

      if (item.isDirectory()) {
        entries.push({
          path: relativePath,
          isDirectory: true,
          extension: "",
          size: 0,
          updatedAt: "",
        });

        // Recurse one level deep for directories
        const subEntries = listDirectory(path.join(dirPath, item.name), relativePath);
        entries.push(...subEntries);
      } else if (isTextFile(item.name)) {
        try {
          const stat = fs.statSync(path.join(dirPath, item.name));
          entries.push({
            path: relativePath,
            isDirectory: false,
            extension: getExtension(item.name),
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
          });
        } catch {
          // Skip files we can't stat
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return entries;
}

function countTextFiles(dirPath: string): number {
  let count = 0;

  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      if (SKIP_DIRS.has(item.name)) continue;
      if (item.name.startsWith(".")) continue;

      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        count += countTextFiles(fullPath);
      } else if (isTextFile(item.name)) {
        count++;
      }
    }
  } catch {
    // Can't read directory
  }

  return count;
}

export function createLocalAdapter(): RepositoryAdapter {
  return {
    type: "local" as ProjectAdapterType,

    async getProject(): Promise<ProjectInfo> {
      const fileCount = countTextFiles(PROJECT_ROOT);
      return { ...LOCAL_PROJECT, fileCount };
    },

    async listFiles(relativePath?: string): Promise<ProjectFileEntry[]> {
      const targetPath = relativePath
        ? path.join(PROJECT_ROOT, normalizePath(relativePath))
        : PROJECT_ROOT;

      return listDirectory(targetPath, relativePath ?? "");
    },

    async readFile(relativePath: string): Promise<ProjectFileContent> {
      const validation = validatePath(relativePath);
      if (!validation.ok) {
        throw new Error(`File access denied: ${validation.reason}`);
      }

      const normalized = normalizePath(relativePath);
      const fullPath = path.join(PROJECT_ROOT, normalized);

      // Verify resolved path is within project root
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(path.resolve(PROJECT_ROOT))) {
        throw new Error("Path traversal detected");
      }

      // Check file size
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        throw new Error(`File not found: ${normalized}`);
      }

      if (stat.size > MAX_FILE_SIZE) {
        throw new Error(`File too large (${(stat.size / 1024).toFixed(0)} KB). Maximum is ${MAX_FILE_SIZE / 1024} KB.`);
      }

      if (stat.isDirectory()) {
        throw new Error(`Cannot read directory as file: ${normalized}`);
      }

      // Check binary
      const ext = getExtension(normalized);
      if (isBinaryExtension(ext)) {
        throw new Error(`Binary file cannot be read as text: ${normalized}`);
      }

      // Read content
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");

      // Check total context size
      if (content.length > MAX_CONTEXT_SIZE) {
        throw new Error(`File content exceeds context limit (${(content.length / 1024).toFixed(0)} KB)`);
      }

      return {
        path: normalized,
        content,
        language: languageForPath(normalized),
        lineCount: lines.length,
        byteSize: content.length,
      };
    },

    async searchFiles(query: string, maxResults = MAX_SEARCH_RESULTS): Promise<ProjectSearchResult[]> {
      if (!query.trim()) return [];

      const lower = query.toLowerCase();
      const results: ProjectSearchResult[] = [];

      function searchDir(dirPath: string, basePath: string) {
        if (results.length >= maxResults) return;

        try {
          const items = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const item of items) {
            if (results.length >= maxResults) return;
            if (SKIP_DIRS.has(item.name)) continue;
            if (item.name.startsWith(".")) continue;

            const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
            if (isDeniedPath(relativePath)) continue;

            if (item.isDirectory()) {
              searchDir(path.join(dirPath, item.name), relativePath);
            } else if (isTextFile(item.name)) {
              // Filename match
              if (item.name.toLowerCase().includes(lower)) {
                results.push({ path: relativePath, snippet: `File: ${relativePath}` });
                continue;
              }

              // Content match (only for small text files)
              try {
                const stat = fs.statSync(path.join(dirPath, item.name));
                if (stat.size <= MAX_FILE_SIZE) {
                  const content = fs.readFileSync(path.join(dirPath, item.name), "utf-8");
                  const lines = content.split("\n");
                  for (let i = 0; i < lines.length; i++) {
                    if (results.length >= maxResults) return;
                    if (lines[i].toLowerCase().includes(lower)) {
                      results.push({
                        path: relativePath,
                        line: i + 1,
                        snippet: lines[i].trim().slice(0, 120),
                      });
                    }
                  }
                }
              } catch {
                // Skip unreadable files
              }
            }
          }
        } catch {
          // Skip unreadable directories
        }
      }

      searchDir(PROJECT_ROOT, "");
      return results.slice(0, maxResults);
    },

    async getAllFilePaths(): Promise<string[]> {
      function collect(dirPath: string, basePath: string): string[] {
        const paths: string[] = [];

        try {
          const items = fs.readdirSync(dirPath, { withFileTypes: true });

          for (const item of items) {
            if (SKIP_DIRS.has(item.name)) continue;
            if (item.name.startsWith(".")) continue;

            const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
            if (isDeniedPath(relativePath)) continue;

            if (item.isDirectory()) {
              paths.push(...collect(path.join(dirPath, item.name), relativePath));
            } else if (isTextFile(item.name)) {
              paths.push(relativePath);
            }
          }
        } catch {
          // Skip
        }

        return paths;
      }

      return collect(PROJECT_ROOT, "");
    },
  };
}
