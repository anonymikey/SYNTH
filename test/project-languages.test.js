import test from 'node:test';
import assert from 'node:assert/strict';
import { kindOf, makeZip, parseFiles } from '../lib/files.js';
import {
  LANGUAGE_OPTIONS,
  SOURCE_ONLY_NOTICE,
  SOURCE_PROJECTS,
  autoProjectPrompt,
  autoProjectRetry,
  inferProjectMode,
  isSourceOnlyLanguage,
  languageLabel,
  languageSelectTitle,
  languageStatus,
  normalizeLanguagePreference,
  parseProjectMode,
  resolveProjectMode,
  sourceProjectEntry,
  sourceProjectIssue,
  sourceProjectPrompt,
  sourceProjectRetry,
  stripProjectModeMarker,
} from '../lib/project-languages.js';

const validProjects = {
  python: { 'main.py': 'print("hello")', 'README.md': 'Run locally:\npython3 main.py' },
  rust: { 'Cargo.toml': '[package]\nname = "demo"\nversion = "0.1.0"\nedition = "2021"', 'src/main.rs': 'fn main() {}', 'README.md': 'Build and test locally:\ncargo test' },
  go: { 'go.mod': 'module example.com/demo\n\ngo 1.23', 'main.go': 'package main', 'README.md': 'Run locally:\ngo run .' },
  cpp: { 'CMakeLists.txt': 'cmake_minimum_required(VERSION 3.15)', 'src/main.cpp': 'int main() { return 0; }', 'README.md': 'Build and run locally:\ncmake -S . -B build\ncmake --build build\n./build/demo' },
  backend: { 'package.json': JSON.stringify({ scripts: { start: 'node server.js' } }), 'server.js': 'const http = require("node:http");', 'README.md': 'Run locally:\nnpm install\nnpm start' },
};

test('Auto is the default language preference and all supported project modes remain available', () => {
  assert.deepEqual(LANGUAGE_OPTIONS.map(({ value }) => value), ['auto', 'web', 'typescript', 'python', 'rust', 'go', 'cpp', 'backend']);
  assert.equal(normalizeLanguagePreference(null), 'auto');
  assert.equal(normalizeLanguagePreference('unknown'), 'auto');
  assert.equal(normalizeLanguagePreference('rust'), 'rust');
  assert.equal(languageLabel('auto'), 'Auto');
  assert.match(languageSelectTitle('auto'), /chooses one supported mode/i);
  for (const language of Object.keys(SOURCE_PROJECTS)) assert.equal(isSourceOnlyLanguage(language), true);
  assert.equal(isSourceOnlyLanguage('typescript'), false);
  assert.equal(languageLabel('backend'), 'Node.js backend');
  assert.match(languageSelectTitle('backend'), /source-only/);
  assert.match(languageStatus('cpp'), /source export only/);
  assert.match(SOURCE_ONLY_NOTICE, /does not compile, test, run, or deploy/);
});

test('Auto prompt selects one mode in the existing generation request and clearly distinguishes source-only exports', () => {
  const prompt = autoProjectPrompt();
  assert.match(prompt, /Choose exactly one best-fit mode/);
  assert.match(prompt, /SYNTHCODE_MODE: <mode>/);
  for (const mode of ['web', 'typescript', 'python', 'rust', 'go', 'cpp', 'backend']) assert.match(prompt, new RegExp(`- ${mode}:`));
  assert.match(prompt, /does not install dependencies, compile, type-check, test, execute, host, or deploy/i);
  assert.match(autoProjectRetry('go'), /SYNTHCODE_MODE: go/);
  assert.match(autoProjectRetry(''), /Choose exactly one supported mode/);
});

test('Auto mode marker parsing and file inference resolve one mode conservatively', () => {
  assert.equal(parseProjectMode('SYNTHCODE_MODE: Go\nBuilt a service.'), 'go');
  assert.equal(parseProjectMode('SYNTHCODE_MODE: PHP\nNot supported.'), '');
  assert.equal(parseProjectMode('A sentence first.\nSYNTHCODE_MODE: python'), '');
  assert.equal(inferProjectMode({ 'main.py': 'print(1)' }), 'python');
  assert.equal(inferProjectMode({ 'Cargo.toml': '[package]', 'src/main.rs': 'fn main() {}' }), 'rust');
  assert.equal(inferProjectMode({ 'go.mod': 'module demo', 'main.go': 'package main' }), 'go');
  assert.equal(inferProjectMode({ 'CMakeLists.txt': 'project(demo)', 'src/main.cpp': 'int main() {}' }), 'cpp');
  assert.equal(inferProjectMode({ 'package.json': '{"scripts":{"start":"node server.js"}}', 'server.js': 'void 0;' }), 'backend');
  assert.equal(inferProjectMode({ 'index.html': '<main/>', 'script.ts': 'document.body' }), 'typescript');
  assert.equal(inferProjectMode({ 'index.html': '<main/>', 'script.js': 'void 0;' }), 'web');
  assert.equal(inferProjectMode({ 'main.py': 'print(1)', 'main.go': 'package main' }), '');
  assert.equal(resolveProjectMode('SYNTHCODE_MODE: cpp\n', { 'index.html': '<main/>' }), 'cpp');
  assert.equal(resolveProjectMode('', { 'src/main.rs': 'fn main() {}' }), 'rust');
});

test('Auto mode marker is removed from visible output without removing the response body', () => {
  assert.equal(stripProjectModeMarker('SYNTHCODE_MODE: rust\n\nGenerated files are ready.\n'), 'Generated files are ready.\n');
  assert.equal(stripProjectModeMarker('SYNTHCODE_MODE:'), '');
  assert.equal(stripProjectModeMarker('The project is ready.'), 'The project is ready.');
});

test('each source project passes validation only with its README and essential files', () => {
  for (const [language, files] of Object.entries(validProjects)) {
    assert.equal(sourceProjectIssue(files, language), '', `${language} should be valid`);
    assert.ok(sourceProjectEntry(files, language), `${language} should have an entry file`);
    assert.match(sourceProjectPrompt(language), /only generates and exports/i);
    assert.match(sourceProjectRetry(language), /source-only/i);
  }
  assert.match(sourceProjectIssue({ 'main.py': 'print(1)' }, 'python'), /README\.md/);
  assert.match(sourceProjectIssue({ 'README.md': 'Run: cargo run', 'src/main.rs': 'fn main() {}' }, 'rust'), /Cargo\.toml/);
  assert.match(sourceProjectIssue({ 'README.md': 'Run: go run .', 'main.go': 'package main' }, 'go'), /go\.mod/);
  assert.match(sourceProjectIssue({ 'README.md': 'Build: g++ src/main.cpp -o demo\nRun: ./demo', 'src/main.cpp': 'int main() {}' }, 'cpp'), /CMakeLists\.txt/);
  assert.match(sourceProjectIssue({ 'README.md': 'Run: npm start', 'package.json': '{}', 'server.js': 'void 0;' }, 'backend'), /start script/);
  assert.match(sourceProjectIssue({ 'README.md': 'Run: npm start', 'package.json': '{', 'server.js': 'void 0;' }, 'backend'), /valid JSON/);
  for (const [language, files] of Object.entries(validProjects)) {
    assert.match(sourceProjectIssue({ ...files, 'README.md': '' }, language), /local .* build\/run\/test command/i, `${language} must reject an empty README`);
  }
  assert.match(sourceProjectIssue({ ...validProjects.go, 'README.md': 'Run locally: python3 main.py' }, 'go'), /local Go build\/run\/test command/i);
  assert.match(sourceProjectIssue({ ...validProjects.cpp, 'README.md': 'Configure with CMake: cmake -S . -B build' }, 'cpp'), /local C\+\+ build\/run\/test command/i);
});

test('language code fences and source-file badges use conventional project paths', () => {
  const parsed = parseFiles([
    '```python\nprint("hello")\n```',
    '```rust\nfn main() {}\n```',
    '```go\npackage main\n```',
    '```cpp\nint main() {}\n```',
    '```c++\nint main() {}\n```',
    '```cmake\nproject(demo)\n```',
    '```toml file=pyproject.toml\n[project]\n```',
  ].join('\n'));
  assert.deepEqual(parsed.files.map(({ path }) => path), ['main.py', 'src/main.rs', 'main.go', 'main.cpp', 'main.cpp', 'CMakeLists.txt', 'pyproject.toml']);
  assert.deepEqual(kindOf('main.py'), { label: 'PY', cls: 'k-python' });
  assert.deepEqual(kindOf('src/main.rs'), { label: 'RS', cls: 'k-rust' });
  assert.deepEqual(kindOf('go.mod'), { label: 'GO', cls: 'k-go' });
  assert.deepEqual(kindOf('src/main.cpp'), { label: 'C++', cls: 'k-cpp' });
  assert.deepEqual(kindOf('Cargo.toml'), { label: 'TOML', cls: 'k-toml' });
  assert.deepEqual(kindOf('CMakeLists.txt'), { label: 'CMAKE', cls: 'k-cmake' });
});

test('source project ZIP retains readable files and local run instructions', () => {
  const zipText = new TextDecoder().decode(makeZip(validProjects.python));
  assert.match(zipText, /main\.py/);
  assert.match(zipText, /README\.md/);
  assert.match(zipText, /python3 main\.py/);
});
