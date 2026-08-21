/**
 * File Safety — denylist and validation for project file access.
 * Prevents secret files from being read or included in AI context.
 */

/** Patterns for files that must never be read or sent to AI context */
const DENY_PATTERNS: RegExp[] = [
  /^\.env$/i,
  /^\.env\.\w+$/i, // .env.local, .env.production, etc.
  /\.pem$/i,
  /\.key$/i,
  /\.p12$/i,
  /\.pfx$/i,
  /\.jks$/i,
  /^credentials\./i,
  /^secrets?\./i,
  /^id_rsa/i,
  /^id_ed25519/i,
  /^id_dsa/i,
  /^id_ecdsa/i,
  /\.pem$/i,
  /node_modules/i,
  /\.next\//i,
  /\.git\//i,
  /\.turbo\//i,
  /dist\//i,
  /build\//i,
  /\.DS_Store/i,
  /Thumbs\.db$/i,
];

/** Max file size for reading: 512 KB */
export const MAX_FILE_SIZE = 512 * 1024;

/** Max total context size: 100 KB */
export const MAX_CONTEXT_SIZE = 100 * 1024;

/** Max search results */
export const MAX_SEARCH_RESULTS = 50;

/** Binary file extensions that should not be read as text */
const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "bmp", "svg",
  "mp3", "mp4", "wav", "avi", "mov",
  "zip", "tar", "gz", "rar", "7z",
  "exe", "dll", "so", "dylib",
  "woff", "woff2", "ttf", "eot",
  "pdf", "doc", "docx", "xls", "xlsx",
  "lock", // lock files (package-lock.json, bun.lockb, etc.)
]);

/** Check if a file path matches any deny pattern */
export function isDeniedPath(relativePath: string): boolean {
  // Normalize separators
  const normalized = relativePath.replace(/\\/g, "/");
  const parts = normalized.split("/");

  // Check each part of the path
  for (const part of parts) {
    for (const pattern of DENY_PATTERNS) {
      if (pattern.test(part)) return true;
    }
  }

  // Check the full filename too
  const filename = parts[parts.length - 1] ?? "";
  for (const pattern of DENY_PATTERNS) {
    if (pattern.test(filename)) return true;
  }

  return false;
}

/** Check if a file extension indicates a binary file */
export function isBinaryExtension(extension: string): boolean {
  return BINARY_EXTENSIONS.has(extension.toLowerCase());
}

/** Normalize a relative path (prevent traversal) */
export function normalizePath(input: string): string {
  // Replace backslashes, remove leading slashes
  const normalized = input.replace(/\\/g, "/").replace(/^\/+/, "");

  // Split into parts and resolve . and ..
  const parts = normalized.split("/").filter((p) => p !== "" && p !== ".");

  const resolved: string[] = [];
  for (const part of parts) {
    if (part === "..") {
      resolved.pop(); // traversal attempt
    } else {
      resolved.push(part);
    }
  }

  return resolved.join("/");
}

/** Validate that a path is safe to read */
export function validatePath(relativePath: string): { ok: boolean; reason?: string } {
  const normalized = normalizePath(relativePath);

  if (!normalized) {
    return { ok: false, reason: "Empty path" };
  }

  // Reject absolute paths
  if (normalized.startsWith("/") || /^[A-Z]:/i.test(normalized)) {
    return { ok: false, reason: "Absolute paths are not allowed" };
  }

  // Reject traversal
  if (normalized.includes("..")) {
    return { ok: false, reason: "Path traversal is not allowed" };
  }

  // Check denylist
  if (isDeniedPath(normalized)) {
    return { ok: false, reason: "Access to this file is restricted" };
  }

  return { ok: true };
}

/** Determine the language from file extension */
export function languageForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    md: "markdown",
    mdx: "mdx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c-header",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    xml: "xml",
    sh: "shell",
    bash: "shell",
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
    env: "dotenv",
    svg: "svg",
    plain: "text",
  };
  return (map[ext] ?? ext) || "text";
}
