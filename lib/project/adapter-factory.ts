/**
 * Repository Adapter Factory — picks the right adapter for the current environment.
 *
 * Selection policy:
 * - Development (non-VERCEL): LocalRepositoryAdapter (reads actual project files)
 * - Vercel/production with GitHub config: GitHubRepositoryAdapter (reads from GitHub API)
 * - Vercel/production without GitHub config: DemoRepositoryAdapter (uses mock fixtures)
 *
 * Caches the adapter instance for the process lifetime.
 */

import type { RepositoryAdapter } from "@/lib/project/types";

let cachedAdapter: RepositoryAdapter | null = null;

function isLocalEnvironment(): boolean {
  // In local development, process.cwd() points to the project root
  // and the filesystem is accessible. On Vercel, this still technically
  // works but files are ephemeral and not meaningful.
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production" && !process.env.SYNTH_LOCAL_FS) return false;
  return true;
}

function isGitHubConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_OWNER?.trim() &&
    process.env.GITHUB_REPO?.trim()
  );
}

/**
 * Get the repository adapter for the current environment.
 * Caches the adapter instance for the process lifetime.
 */
export async function getRepositoryAdapter(): Promise<RepositoryAdapter> {
  if (cachedAdapter) return cachedAdapter;

  // 1. Local development: try local filesystem adapter
  if (isLocalEnvironment()) {
    try {
      const { createLocalAdapter } = await import("@/lib/project/local-adapter");
      const adapter = createLocalAdapter();
      await adapter.getProject();
      cachedAdapter = adapter;
      return adapter;
    } catch {
      // Local access failed, fall through
    }
  }

  // 2. GitHub configured: use GitHub adapter
  if (isGitHubConfigured()) {
    try {
      const { createGitHubAdapter } = await import("@/lib/project/github-adapter");
      const adapter = createGitHubAdapter({
        owner: process.env.GITHUB_OWNER!.trim(),
        repo: process.env.GITHUB_REPO!.trim(),
        ref: process.env.GITHUB_REF?.trim() || "main",
        token: process.env.GITHUB_TOKEN?.trim(),
      });
      // Verify the adapter can access the project
      await adapter.getProject();
      cachedAdapter = adapter;
      return adapter;
    } catch {
      // GitHub access failed, fall through to demo
    }
  }

  // 3. Fallback: demo adapter
  const { createDemoAdapter } = await import("@/lib/project/demo-adapter");
  cachedAdapter = createDemoAdapter();
  return cachedAdapter;
}
