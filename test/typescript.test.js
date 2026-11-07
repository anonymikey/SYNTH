import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as esbuild from 'esbuild-wasm';
import { kindOf, parseFiles, typescriptEntry, typescriptFiles } from '../lib/files.js';
import { assertStandaloneTypeScript } from '../lib/typescript-source.js';

const builderSource = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');

test('fresh-project welcome exposes language preferences in Settings before the first build', () => {
  const welcomeBranch = builderSource.split('if (welcome) {')[1]?.split("\n  return (\n    <section className={'build'")[0] || '';
  assert.match(welcomeBranch, /BuilderLanguageSettings open=\{settingsOpen\}/);
  assert.match(welcomeBranch, /LanguageSettingsButton preference=\{languagePreference\}/);
  assert.match(welcomeBranch, /onClick=\{\(\) => setSettingsOpen\(true\)\}/);
  assert.match(welcomeBranch, /disabled=\{!preferenceReady/);
});

test('TypeScript code fences default to script.ts and are recognized by the explorer', () => {
  const parsed = parseFiles('```ts\nconst count: number = 3;\n```');
  assert.equal(parsed.files.length, 1);
  assert.equal(parsed.files[0].path, 'script.ts');
  assert.deepEqual(typescriptFiles({ [parsed.files[0].path]: parsed.files[0].content }), ['script.ts']);
  assert.equal(typescriptEntry({ 'script.ts': parsed.files[0].content }), 'script.ts');
  assert.deepEqual(kindOf('script.ts'), { label: 'TS', cls: 'k-ts' });
});

test('TypeScript entry selection requires exactly one runtime source file', () => {
  assert.equal(typescriptEntry({ 'script.ts': 'const item = "ok";' }), 'script.ts');
  assert.equal(typescriptEntry({ 'types.ts': 'type Item = string;', 'script.ts': 'const item: Item = "ok";' }), '');
  assert.equal(typescriptEntry({ 'one.ts': 'const one = 1;', 'two.ts': 'const two = 2;' }), '');
  assert.deepEqual(typescriptFiles({ 'types.d.ts': 'declare const value: string;', 'script.ts': 'void 0;' }), ['script.ts']);
});

test('esbuild compiles TypeScript syntax into browser-ready JavaScript', async () => {
  const result = await esbuild.transform(
    'const count: number = 3; document.body.dataset.count = String(count);',
    { loader: 'ts', sourcefile: 'script.ts', target: 'es2020', format: 'iife', legalComments: 'none' },
  );
  assert.match(result.code, /document\.body\.dataset\.count/);
  assert.doesNotMatch(result.code, /count:\s*number/);
  assert.match(result.code, /\(\(\) =>/);
});

test('the first TypeScript profile rejects unresolved module imports before browser preview', async () => {
  const result = await esbuild.transform('import { value } from "./value"; console.log(value);', { loader: 'ts', format: 'iife' });
  assert.throws(() => assertStandaloneTypeScript(result.code), /without module imports/);
});
