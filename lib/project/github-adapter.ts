/**
 * GitHubRepositoryAdapter — read-only access to a GitHub repository via the REST API.
 * Runs server-side only. Never exposes GitHub tokens to the browser.
 *
 * Security:
 * - All paths validated through existing file-safety layer
 * - GitHub token read from server environment only
 * - No client-side GitHub API calls
 * - No file writes, commits, pushes, or branch mutations
 */

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
  MAX_FILE_SIZE,
  MAX_SEARCH_RESULTS,
  normalizePath,
  validatePath,
} from "@/lib/project/file-safety";

const GITHUB_API = "https://api.github.com";

/* ------------------------------------------------------------------ */
/*  Simple in-memory TTL cache                                        */
/* ------------------------------------------------------------------ */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000; // 1 minute

function cacheGet<T>(key: string): T | undefined {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.data;
}

function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

/* ------------------------------------------------------------------ */
/*  GitHub API helpers                                                */
/* ------------------------------------------------------------------ */

interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}

interface GitHubTreeResponse {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

interface GitHubSearchItem {
  name: string;
  path: string;
  sha: string;
  score: number;
}

interface GitHubSearchResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubSearchItem[];
}

interface GitHubRepoResponse {
  default_branch: string;
  language: string | null;
  description: string | null;
}

async function githubFetch<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SYNTH-Platform/0.1",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });

  if (response.status === 403) {
    const body = await response.json().catch(() => ({}));
    const message = (body as Record<string, unknown>).message;
    if (String(message).includes("rate limit")) {
      throw new Error("GitHub API rate limit exceeded. Try again later.");
    }
    throw new Error("GitHub API access denied. Check your GITHUB_TOKEN permissions.");
  }

  if (response.status === 404) {
    throw new Error("GitHub repository or file not found. Check GITHUB_OWNER and GITHUB_REPO.");
  }

  if (response.status === 401) {
    throw new Error("GitHub authentication failed. Check your GITHUB_TOKEN.");
  }

  if (!response.ok) {
    throw new Error(`GitHub API error (${response.status})`);
  }

  return response.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/*  Adapter                                                           */
/* ------------------------------------------------------------------ */

interface GitHubAdapterConfig {
  owner: string;
  repo: string;
  ref: string;
  token?: string;
}

export function createGitHubAdapter(config: GitHubAdapterConfig): RepositoryAdapter {
  const { owner, repo, ref, token } = config;
  const repoId = `github:${owner}/${repo}@${ref}`;

  /** Fetch the git tree (recursive) for the configured ref */
  async function fetchTree(): Promise<GitHubTreeEntry[]> {
    const cacheKey = `tree:${repoId}`;
    const cached = cacheGet<GitHubTreeEntry[]>(cacheKey);
    if (cached) return cached;

    const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${ref}?recursive=1`;
    const data = await githubFetch<GitHubTreeResponse>(url, token);

    if (data.truncated) {
      // Tree is too large — fall back to root listing
      const rootUrl = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${ref}`;
      const rootData = await githubFetch<{ tree: GitHubTreeEntry[] }>(rootUrl, token);
      const entries = rootData.tree.filter((e) => e.type === "blob" || e.type === "tree");
      cacheSet(cacheKey, entries, 30_000);
      return entries;
    }

    cacheSet(cacheKey, data.tree, 60_000);
    return data.tree;
  }

  /** Filter tree entries through safety layer */
  function filterEntries(entries: GitHubTreeEntry[]): GitHubTreeEntry[] {
    return entries.filter((entry) => {
      // Filter denied paths
      if (isDeniedPath(entry.path)) return false;

      // For blobs, filter binary extensions
      if (entry.type === "blob") {
        const ext = entry.path.split(".").pop()?.toLowerCase() ?? "";
        if (isBinaryExtension(ext)) return false;
        // Skip files that are too large
        if (entry.size && entry.size > MAX_FILE_SIZE) return false;
      }

      return true;
    });
  }

  /** Convert a tree entry to ProjectFileEntry */
  function toFileEntry(entry: GitHubTreeEntry): ProjectFileEntry {
    return {
      path: entry.path,
      isDirectory: entry.type === "tree",
      extension: entry.type === "blob" ? (entry.path.split(".").pop()?.toLowerCase() ?? "") : "",
      size: entry.size ?? 0,
      updatedAt: "", // GitHub tree API doesn't provide per-file timestamps
    };
  }

  return {
    type: "github" as ProjectAdapterType,

    async getProject(): Promise<ProjectInfo> {
      // Try to get repo metadata for language/framework detection
      let language = "Unknown";
      let description = "";

      try {
        const cacheKey = `repo:${repoId}`;
        const cached = cacheGet<GitHubRepoResponse>(cacheKey);
        if (cached) {
          language = cached.language ?? "Unknown";
          description = cached.description ?? "";
        } else {
          const url = `${GITHUB_API}/repos/${owner}/${repo}`;
          const data = await githubFetch<GitHubRepoResponse>(url, token);
          language = data.language ?? "Unknown";
          description = data.description ?? "";
          cacheSet(cacheKey, data, 300_000); // 5 min cache for repo metadata
        }
      } catch {
        // If we can't fetch repo metadata, use defaults
      }

      // Count files from tree
      let fileCount = 0;
      try {
        const tree = await fetchTree();
        fileCount = filterEntries(tree).filter((e) => e.type === "blob").length;
      } catch {
        // Default file count
      }

      return {
        id: repoId,
        name: `${owner}/${repo}`,
        adapterType: "github",
        language,
        framework: detectFramework(description),
        fileCount,
        version: ref,
        readOnly: true,
        github: {
          owner,
          repo,
          ref,
          url: `https://github.com/${owner}/${repo}`,
        },
      };
    },

    async listFiles(relativePath?: string): Promise<ProjectFileEntry[]> {
      const tree = await fetchTree();
      const filtered = filterEntries(tree);

      if (!relativePath) {
        // Root level: return top-level entries
        const topLevel = new Map<string, GitHubTreeEntry>();
        for (const entry of filtered) {
          const parts = entry.path.split("/");
          if (parts.length === 1) {
            // Root file
            topLevel.set(entry.path, entry);
          } else {
            // Directory — create a virtual directory entry
            const dirPath = parts[0];
            if (!topLevel.has(dirPath)) {
              topLevel.set(dirPath, {
                path: dirPath,
                mode: "040000",
                type: "tree",
                sha: "",
              });
            }
          }
        }
        return [...topLevel.values()].map(toFileEntry).sort((a, b) => {
          // Directories first, then alphabetical
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.path.localeCompare(b.path);
        });
      }

      // Subdirectory: return entries within that path
      const normalized = normalizePath(relativePath);
      const prefix = normalized.endsWith("/") ? normalized : `${normalized}/`;
      const entries = new Map<string, GitHubTreeEntry>();

      for (const entry of filtered) {
        if (!entry.path.startsWith(prefix)) continue;
        const rest = entry.path.slice(prefix.length);
        const parts = rest.split("/");

        if (parts.length === 1) {
          // Direct child
          entries.set(entry.path, entry);
        } else {
          // Nested — create virtual directory
          const dirPath = `${prefix}${parts[0]}`;
          if (!entries.has(dirPath)) {
            entries.set(dirPath, {
              path: dirPath,
              mode: "040000",
              type: "tree",
              sha: "",
            });
          }
        }
      }

      return [...entries.values()].map(toFileEntry).sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.path.localeCompare(b.path);
      });
    },

    async readFile(relativePath: string): Promise<ProjectFileContent> {
      const validation = validatePath(relativePath);
      if (!validation.ok) {
        throw new Error(`File access denied: ${validation.reason}`);
      }

      const normalized = normalizePath(relativePath);

      // Check cache
      const cacheKey = `file:${repoId}:${normalized}`;
      const cached = cacheGet<ProjectFileContent>(cacheKey);
      if (cached) return cached;

      // Fetch from GitHub
      const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${normalized}?ref=${ref}`;
      const data = await githubFetch<{
        content?: string;
        encoding?: string;
        size?: number;
        message?: string;
      }>(url, token);

      if (data.message) {
        throw new Error(`File not found: ${normalized}`);
      }

      if (!data.content) {
        throw new Error(`File not found: ${normalized}`);
      }

      // Decode base64 content
      let content: string;
      if (data.encoding === "base64") {
        content = Buffer.from(data.content, "base64").toString("utf-8");
      } else {
        content = data.content;
      }

      // Enforce size limits
      if (content.length > MAX_FILE_SIZE) {
        throw new Error(`File too large (${(content.length / 1024).toFixed(0)} KB). Maximum is ${MAX_FILE_SIZE / 1024} KB.`);
      }

      // Check if it's binary (GitHub sometimes returns decoded binary content)
      const ext = normalized.split(".").pop()?.toLowerCase() ?? "";
      if (isBinaryExtension(ext)) {
        throw new Error(`Binary file cannot be read as text: ${normalized}`);
      }

      const lines = content.split("\n");
      const result: ProjectFileContent = {
        path: normalized,
        content,
        language: languageForPath(normalized),
        lineCount: lines.length,
        byteSize: content.length,
      };

      // Cache the result
      cacheSet(cacheKey, result, 120_000); // 2 min cache for files
      return result;
    },

    async searchFiles(query: string, maxResults = MAX_SEARCH_RESULTS): Promise<ProjectSearchResult[]> {
      if (!query.trim()) return [];

      // Try GitHub code search first (requires auth for private repos)
      const cacheKey = `search:${repoId}:${query}:${maxResults}`;
      const cached = cacheGet<ProjectSearchResult[]>(cacheKey);
      if (cached) return cached;

      try {
        const searchQuery = `${query} repo:${owner}/${repo} ref:${ref}`;
        const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(searchQuery)}&per_page=${maxResults}`;
        const data = await githubFetch<GitHubSearchResponse>(url, token);

        const results: ProjectSearchResult[] = data.items.map((item) => ({
          path: item.path,
          snippet: `Match in ${item.path}`,
        }));

        cacheSet(cacheKey, results, 30_000);
        return results.slice(0, maxResults);
      } catch {
        // GitHub code search might not be available (rate limits, etc.)
        // Fall back to tree-based filename search
        const tree = await fetchTree();
        const filtered = filterEntries(tree);
        const lower = query.toLowerCase();

        const results: ProjectSearchResult[] = [];
        for (const entry of filtered) {
          if (results.length >= maxResults) break;
          if (entry.type !== "blob") continue;

          // Filename match
          if (entry.path.toLowerCase().includes(lower)) {
            results.push({ path: entry.path, snippet: `File: ${entry.path}` });
          }
        }

        cacheSet(cacheKey, results, 30_000);
        return results;
      }
    },

    async getAllFilePaths(): Promise<string[]> {
      const tree = await fetchTree();
      const filtered = filterEntries(tree);
      return filtered
        .filter((e) => e.type === "blob")
        .map((e) => e.path)
        .sort();
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Framework detection                                               */
/* ------------------------------------------------------------------ */

function detectFramework(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes("next.js") || lower.includes("nextjs")) return "Next.js";
  if (lower.includes("react")) return "React";
  if (lower.includes("vue")) return "Vue";
  if (lower.includes("angular")) return "Angular";
  if (lower.includes("svelte")) return "Svelte";
  if (lower.includes("nuxt")) return "Nuxt";
  if (lower.includes("astro")) return "Astro";
  if (lower.includes("remix")) return "Remix";
  if (lower.includes("vite")) return "Vite";
  if (lower.includes("typescript")) return "TypeScript";
  return "GitHub Repository";
}
