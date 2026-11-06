import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');
const banner = readFileSync(new URL('../components/CapabilityBanner.js', import.meta.url), 'utf8');
const updates = readFileSync(new URL('../app/dev-updates/data.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('both SYNTHCODE composers expose the registered project modes', () => {
  assert.equal((builder.match(/Object\.entries\(SOURCE_PROJECTS\)\.map/g) || []).length, 2);
  assert.match(builder, /aria-label="Project language"/);
  assert.match(builder, /disabled=\{busy \|\| hasFiles\}/);
  assert.match(builder, /value === 'backend' \? 'Backend' : project\.label/);
});

test('source-only projects never enter the browser preview and explain the boundary in both panes', () => {
  assert.match(builder, /if \(sourceOnly\) return ''/);
  assert.match(builder, /setView\(sourceOnly \? 'code' : 'preview'\)/);
  assert.match(builder, /source-only-preview/);
  assert.match(builder, /source-export-note/);
  assert.match(builder, /SYNTHCODE is generating text files; it is not compiling or running this project/);
  assert.match(builder, /Download project ZIP/);
  assert.match(builder, /sourceProjectIssue\(files, language\)/);
  assert.match(builder, /sourceProjectRetry\(language\)/);
});

test('mobile keeps the pre-generation source-only notice visible', () => {
  assert.match(builder, /sourceOnly \? ' source-only-tools' : ''/);
  const genericHide = css.indexOf('.tools span{display:none}');
  const sourceOnlyOverride = css.indexOf('.tools.source-only-tools span{display:block');
  assert.ok(genericHide >= 0 && sourceOnlyOverride > genericHide, 'the mobile source-only rule must override hidden generic helper text');
});

test('one combined multi-language release banner is shown after the previous version was dismissed', () => {
  assert.match(banner, /synth-capabilities-banner-v2/);
  assert.match(banner, /Python, Rust, Go, C\+\+ and Node\.js backend/);
  assert.match(banner, /dev-updates\/synthcode-multilanguage-projects/);
  assert.match(updates, /slug: 'synthcode-multilanguage-projects'/);
  assert.match(updates, /does not install dependencies, compile, test, run, host, or deploy/);
});
