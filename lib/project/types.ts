/**
 * SYNTH Project Context — RepositoryAdapter abstraction.
 * Provides a provider-neutral boundary between the UI and the underlying
 * file system / repository. The adapter is always server-side.
 */

export type ProjectAdapterType = "local" | "demo" | "github";

export interface ProjectFileEntry {
  /** Relative path from project root (e.g. "engine/synth-engine.ts") */
  path: string;
  /** Whether this entry is a directory */
  isDirectory: boolean;
  /** File extension without dot (e.g. "ts", "tsx"), empty for directories */
  extension: string;
  /** Size in bytes (0 for directories, unknown for demo) */
  size: number;
  /** Last modified ISO string (unknown for demo) */
  updatedAt: string;
}

export interface ProjectFileContent {
  path: string;
  content: string;
  language: string;
  lineCount: number;
  byteSize: number;
}

export interface ProjectSearchResult {
  path: string;
  line?: number;
  snippet: string;
}

export interface ProjectInfo {
  /** Stable ID for the project */
  id: string;
  /** Display name */
  name: string;
  /** Adapter type */
  adapterType: ProjectAdapterType;
  /** Programming language (e.g. "TypeScript") */
  language: string;
  /** Framework (e.g. "Next.js App Router") */
  framework: string;
  /** Total file count */
  fileCount: number;
  /** Product version */
  version: string;
  /** Whether files are editable (always false in this phase) */
  readOnly: boolean;
  /** GitHub-specific metadata (only present when adapterType === "github") */
  github?: {
    owner: string;
    repo: string;
    ref: string;
    /** Full repository URL for display */
    url: string;
  };
}

export interface RepositoryAdapter {
  /** Adapter type identifier */
  readonly type: ProjectAdapterType;

  /** Get project metadata */
  getProject(): Promise<ProjectInfo>;

  /** List files and directories at a path (default: root "") */
  listFiles(relativePath?: string): Promise<ProjectFileEntry[]>;

  /** Read a file's text content */
  readFile(relativePath: string): Promise<ProjectFileContent>;

  /** Search files by query (filename + content) */
  searchFiles(query: string, maxResults?: number): Promise<ProjectSearchResult[]>;

  /** Get a flat file listing (for search / context) */
  getAllFilePaths(): Promise<string[]>;
}
