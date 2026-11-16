import { safeFilePath } from './files.js';

export const GITHUB_IMPORT_LIMITS = Object.freeze({
  files: 50,
  fileBytes: 128_000,
  totalBytes: 400_000,
  treeEntries: 2_000,
});

const EXCLUDED_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', 'target', 'vendor', 'coverage', '__pycache__', '.venv', 'venv']);
const EXCLUDED_NAMES = new Set(['.npmrc', '.pypirc', '.netrc', 'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', 'authorized_keys', 'known_hosts', 'credentials', 'credentials.json', 'secrets', 'secrets.json', 'service-account.json']);
const SECRET_EXT = /\.(?:pem|key|p12|pfx|p7b|p7c|jks|keystore|der)$/i;
const BINARY_EXT = /\.(?:png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|gz|7z|rar|exe|dll|so|dylib|wasm|woff2?|ttf|otf|mp[34]|wav|mp4|mov|avi|sqlite|db|bin|class|jar)$/i;
const API_VERSION = '2026-03-10';

export function safeGitHubRepoName(value) {
  const name = String(value || '');
  if (!/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(name)) return '';
  return name.split('/').every((part) => part !== '.' && part !== '..') ? name : '';
}

export function safeGitHubBranch(value) {
  const branch = String(value || '');
  if (!branch || branch.length > 240 || branch.startsWith('-') || branch.endsWith('/') || branch.endsWith('.')) return '';
  if (branch.includes('..') || branch.includes('//') || branch.includes('\\') || /[\x00-\x20\x7f~^:?*\[\]]/.test(branch)) return '';
  const segments = branch.split('/');
  if (segments.some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))) return '';
  return /^[A-Za-z0-9_./-]+$/.test(branch) ? branch : '';
}

export function isExcludedGitHubPath(path) {
  const safe = safeFilePath(path);
  if (!safe) return true;
  const parts = safe.toLowerCase().split('/');
  const basename = parts[parts.length - 1];
  if (parts.some((part) => EXCLUDED_DIRS.has(part))) return true;
  if (parts.slice(0, -1).some((part) => /^(?:secret|secrets|credential|credentials)$/.test(part))) return true;
  if (parts.length >= 3 && parts[0] === '.github' && parts[1] === 'workflows') return true;
  if (EXCLUDED_NAMES.has(basename) || SECRET_EXT.test(basename) || BINARY_EXT.test(basename)) return true;
  if (/^\.env(?:$|[.-])/.test(basename) || /^\.envrc(?:$|[.-])/.test(basename) || /^(?:secret|secrets|credential|credentials)(?:[._-]|$)/.test(basename)) return true;
  if (parts.some((part) => /^(?:\.ssh|\.aws|\.gnupg)$/.test(part))) return true;
  return false;
}

export function listImportableTreeEntries(tree, { limit = GITHUB_IMPORT_LIMITS.treeEntries } = {}) {
  if (!Array.isArray(tree)) return { files: [], capped: false, skipped: 0 };
  const files = [];
  let skipped = 0;
  for (const entry of tree) {
    if (!entry || entry.type !== 'blob' || !['100644', '100755'].includes(String(entry.mode))) continue;
    const path = safeFilePath(entry.path);
    const size = Number(entry.size);
    if (!path || isExcludedGitHubPath(path) || !/^[a-f0-9]{40}$/i.test(String(entry.sha || '')) || !Number.isSafeInteger(size) || size < 0 || size > GITHUB_IMPORT_LIMITS.fileBytes) {
      skipped++;
      continue;
    }
    files.push({ path, sha: String(entry.sha), size, mode: String(entry.mode) });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const capped = files.length > limit;
  return { files: files.slice(0, limit), capped, skipped };
}

export function decodeGitHubTextBlob(blob, expectedPath = '') {
  if (!blob || blob.encoding !== 'base64' || typeof blob.content !== 'string') return null;
  if (expectedPath && (isExcludedGitHubPath(expectedPath) || !safeFilePath(expectedPath))) return null;
  const base64 = blob.content.replace(/\s+/g, '');
  if (!base64 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return null;
  try {
    const binary = atob(base64);
    if (binary.length > GITHUB_IMPORT_LIMITS.fileBytes || binary.includes('\0')) return null;
    const content = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    if (new TextEncoder().encode(content).byteLength > GITHUB_IMPORT_LIMITS.fileBytes) return null;
    if (content.startsWith('version https://git-lfs.github.com/spec/v1')) return null;
    return content;
  } catch {
    return null;
  }
}

export function validateGitHubImportSelection(selection, treeFiles) {
  if (!Array.isArray(selection) || selection.length < 1 || selection.length > GITHUB_IMPORT_LIMITS.files) return { ok: false, error: 'selection-limit' };
  if (new Set(selection).size !== selection.length) return { ok: false, error: 'duplicate-path' };
  const byPath = new Map((Array.isArray(treeFiles) ? treeFiles : []).map((file) => [file.path, file]));
  const selected = [];
  let totalBytes = 0;
  for (const path of selection) {
    const safe = safeFilePath(path);
    const file = safe && !isExcludedGitHubPath(safe) ? byPath.get(safe) : null;
    if (!file) return { ok: false, error: 'invalid-path' };
    if (file.size > GITHUB_IMPORT_LIMITS.fileBytes) return { ok: false, error: 'file-too-large' };
    totalBytes += file.size;
    if (totalBytes > GITHUB_IMPORT_LIMITS.totalBytes) return { ok: false, error: 'total-too-large' };
    selected.push(file);
  }
  return { ok: true, files: selected, totalBytes };
}

export function diffGitHubProject(originalFiles, workingFiles) {
  const original = originalFiles && typeof originalFiles === 'object' && !Array.isArray(originalFiles) ? originalFiles : {};
  const working = workingFiles && typeof workingFiles === 'object' && !Array.isArray(workingFiles) ? workingFiles : {};
  const paths = new Set([...Object.keys(original), ...Object.keys(working)]);
  const changes = [];
  for (const path of [...paths].sort()) {
    const before = Object.prototype.hasOwnProperty.call(original, path) ? String(original[path]) : null;
    const after = Object.prototype.hasOwnProperty.call(working, path) ? String(working[path]) : null;
    if (before === after) continue;
    changes.push({ path, content: after, kind: before === null ? 'add' : after === null ? 'delete' : 'edit' });
  }
  return changes;
}

export function validateGitHubChanges(changes, originalFiles = {}) {
  if (!Array.isArray(changes) || changes.length < 1 || changes.length > GITHUB_IMPORT_LIMITS.files) return { ok: false, error: 'change-limit' };
  const seen = new Set();
  let totalBytes = 0;
  const safeChanges = [];
  for (const change of changes) {
    const path = safeFilePath(change?.path);
    if (!path || isExcludedGitHubPath(path) || seen.has(path)) return { ok: false, error: 'invalid-path' };
    seen.add(path);
    const content = change.content === null ? null : typeof change.content === 'string' ? change.content : undefined;
    if (content === undefined || (content === null && !Object.prototype.hasOwnProperty.call(originalFiles, path)) || (content !== null && content.includes('\0'))) return { ok: false, error: 'invalid-change' };
    if (content !== null) {
      const bytes = new TextEncoder().encode(content).byteLength;
      if (bytes > GITHUB_IMPORT_LIMITS.fileBytes) return { ok: false, error: 'file-too-large' };
      totalBytes += bytes;
      if (totalBytes > GITHUB_IMPORT_LIMITS.totalBytes) return { ok: false, error: 'total-too-large' };
    }
    safeChanges.push({ path, content, kind: content === null ? 'delete' : Object.prototype.hasOwnProperty.call(originalFiles, path) ? 'edit' : 'add' });
  }
  return { ok: true, changes: safeChanges, totalBytes };
}

export function githubApiPath(...parts) {
  return parts.map((part) => String(part).split('/').map(encodeURIComponent).join('/')).join('/');
}

export { API_VERSION as GITHUB_API_VERSION };
