import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanPath, filesForPrompt, parseFiles, safeFilePath } from '../lib/files.js';
import {
  decodeGitHubTextBlob,
  diffGitHubProject,
  isExcludedGitHubPath,
  listImportableTreeEntries,
  safeGitHubBranch,
  safeGitHubRepoName,
  validateGitHubChanges,
  validateGitHubImportSelection,
} from '../lib/github-repo.js';

const sha = 'a'.repeat(40);

test('safe project paths allow conventional extensionless files and reject traversal or unsafe separators', () => {
  assert.equal(safeFilePath('Dockerfile'), 'Dockerfile');
  assert.equal(safeFilePath('src/Makefile'), 'src/Makefile');
  assert.equal(cleanPath('.gitignore'), '.gitignore');
  assert.equal(safeFilePath('src/main.rs'), 'src/main.rs');
  for (const bad of ['../secrets.txt', 'src/../../secrets', '/etc/passwd', 'C:/secret.txt', 'src\\..\\secret', 'src//main.js', 'src/./main.js', 'x\nsecret', 'file?.js']) {
    assert.equal(safeFilePath(bad), '', `reject ${JSON.stringify(bad)}`);
  }
});

test('extensionless repository headers parse without mistaking source fence labels for filenames', () => {
  const parsed = parseFiles([
    '```python\nprint("hello")\n```',
    '```rust\nfn main() {}\n```',
    '```Dockerfile\nFROM node:22\n```',
    'File: Makefile\n```text\nall:\n\techo done\n```',
  ].join('\n'));
  assert.deepEqual(parsed.files.map((file) => file.path), ['main.py', 'src/main.rs', 'Dockerfile', 'Makefile']);
});

test('open repository file is included first within the existing prompt-context budget', () => {
  const context = filesForPrompt({ 'a.js': 'A'.repeat(20), 'src/main.rs': 'R'.repeat(20) }, 'src/main.rs', 24);
  assert.match(context, /--- src\/main\.rs ---\nR{20}/);
  assert.match(context, /--- a\.js \(not shown/);
});

test('repository paths and tree entries filter secrets, generated folders, binary extensions and links', () => {
  assert.equal(isExcludedGitHubPath('.env.production'), true);
  assert.equal(isExcludedGitHubPath('.envrc'), true);
  assert.equal(isExcludedGitHubPath('.envrc.local'), true);
  assert.equal(isExcludedGitHubPath('secrets/private.txt'), true);
  assert.equal(isExcludedGitHubPath('.github/workflows/deploy.yml'), true);
  const result = listImportableTreeEntries([
    { path: 'README.md', type: 'blob', mode: '100644', sha, size: 80 },
    { path: 'src/main.rs', type: 'blob', mode: '100644', sha, size: 120 },
    { path: 'Dockerfile', type: 'blob', mode: '100644', sha, size: 30 },
    { path: '.env', type: 'blob', mode: '100644', sha, size: 10 },
    { path: '.envrc', type: 'blob', mode: '100644', sha, size: 15 },
    { path: 'assets/logo.png', type: 'blob', mode: '100644', sha, size: 20 },
    { path: 'src/link.txt', type: 'blob', mode: '120000', sha, size: 8 },
    { path: 'modules/submodule', type: 'commit', mode: '160000', sha, size: 0 },
    { path: 'src/too-large.txt', type: 'blob', mode: '100644', sha, size: 128_001 },
  ]);
  assert.deepEqual(result.files.map((file) => file.path), ['Dockerfile', 'README.md', 'src/main.rs']);
  assert.equal(result.skipped, 4);
});

test('repository-tree display limit is explicit instead of silently claiming a complete tree', () => {
  const entries = Array.from({ length: 4 }, (_, index) => ({ path: `src/file${index}.txt`, type: 'blob', mode: '100644', sha, size: 4 }));
  const result = listImportableTreeEntries(entries, { limit: 2 });
  assert.equal(result.files.length, 2);
  assert.equal(result.capped, true);
});

test('blob decoding accepts bounded UTF-8 text and rejects binary, invalid and Git LFS pointer blobs', () => {
  assert.equal(decodeGitHubTextBlob({ encoding: 'base64', content: btoa('hello\n') }, 'README.md'), 'hello\n');
  assert.equal(decodeGitHubTextBlob({ encoding: 'base64', content: btoa('a\0b') }, 'data.txt'), null);
  assert.equal(decodeGitHubTextBlob({ encoding: 'base64', content: '%%%=' }, 'data.txt'), null);
  assert.equal(decodeGitHubTextBlob({ encoding: 'base64', content: btoa('version https://git-lfs.github.com/spec/v1\n') }, 'model.txt'), null);
  assert.equal(decodeGitHubTextBlob({ encoding: 'utf-8', content: 'text' }, 'README.md'), null);
  assert.equal(decodeGitHubTextBlob({ encoding: 'base64', content: btoa('text') }, '.env'), null);
});

test('import selection is restricted to the shown tree and bounded by file and total bytes', () => {
  const tree = [
    { path: 'README.md', sha, size: 110_000 },
    { path: 'src/main.rs', sha, size: 110_000 },
    { path: 'src/lib.rs', sha, size: 110_000 },
    { path: 'src/tests.rs', sha, size: 110_000 },
    { path: 'src/large.rs', sha, size: 128_001 },
    { path: 'LICENSE', sha, size: 20 },
  ];
  assert.equal(validateGitHubImportSelection(['README.md', 'src/main.rs', 'src/lib.rs', 'src/tests.rs'], tree).error, 'total-too-large');
  assert.equal(validateGitHubImportSelection(['src/large.rs'], tree).error, 'file-too-large');
  assert.equal(validateGitHubImportSelection(['missing.txt'], tree).error, 'invalid-path');
  assert.equal(validateGitHubImportSelection(['README.md', 'README.md'], tree).error, 'duplicate-path');
  assert.equal(validateGitHubImportSelection([], tree).error, 'selection-limit');
  assert.equal(validateGitHubImportSelection(['LICENSE'], tree).ok, true);
});

test('local GitHub file diff and publish validation retain adds, edits and deletes only', () => {
  const original = { 'README.md': 'old', 'src/main.rs': 'fn main() {}' };
  const working = { 'README.md': 'new', 'Cargo.toml': '[package]' };
  const changes = diffGitHubProject(original, working);
  assert.deepEqual(changes, [
    { path: 'Cargo.toml', content: '[package]', kind: 'add' },
    { path: 'README.md', content: 'new', kind: 'edit' },
    { path: 'src/main.rs', content: null, kind: 'delete' },
  ]);
  assert.equal(validateGitHubChanges(changes, original).ok, true);
  assert.equal(validateGitHubChanges([{ path: '../.env', content: 'x' }], {}).error, 'invalid-path');
  assert.equal(validateGitHubChanges([{ path: 'src/main.rs', content: null }], {}).error, 'invalid-change');
});

test('repository and branch identifiers are constrained before building GitHub API paths', () => {
  assert.equal(safeGitHubRepoName('octocat/hello-world'), 'octocat/hello-world');
  assert.equal(safeGitHubRepoName('https://github.com/octocat/hello-world'), '');
  assert.equal(safeGitHubBranch('feature/new-page'), 'feature/new-page');
  assert.equal(safeGitHubBranch('../main'), '');
  assert.equal(safeGitHubBranch('main?redirect=evil'), '');
});
