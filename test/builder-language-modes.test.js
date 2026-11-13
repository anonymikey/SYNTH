import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../components/BuilderLanguageSettings.js', import.meta.url), 'utf8');
const banner = readFileSync(new URL('../components/CapabilityBanner.js', import.meta.url), 'utf8');
const updates = readFileSync(new URL('../app/dev-updates/data.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('Auto is the default and the same SYNTHCODE generation pipeline resolves the project mode', () => {
  assert.match(builder, /useState\('auto'\)/);
  assert.match(builder, /requestedLanguage === 'auto' \? autoProjectPrompt\(\)/);
  assert.match(builder, /resolveProjectMode\(reply, merged\.files\)/);
  assert.match(builder, /mode: 'build'/);
  assert.match(builder, /stripProjectModeMarker\(reply\)/);
  assert.match(builder, /setLanguage\(projectLanguage\)/);
});

test('language preference is saved locally in SYNTHCODE and appears in a side settings dialog', () => {
  assert.match(builder, /LANGUAGE_PREFERENCE_KEY = 'synthcode-language-preference-v1'/);
  assert.match(builder, /window\.localStorage\.getItem\(LANGUAGE_PREFERENCE_KEY\)/);
  assert.match(builder, /window\.localStorage\.setItem\(LANGUAGE_PREFERENCE_KEY, languagePreference\)/);
  assert.match(builder, /setLanguage\(languagePreference\)/);
  assert.match(builder, /LanguageSettingsButton/);
  assert.match(builder, /BuilderLanguageSettings/);
  assert.doesNotMatch(builder, /aria-label="Project language"/);
  assert.match(settings, /role="dialog"/);
  assert.match(settings, /aria-modal="true"/);
  assert.match(settings, /Auto is recommended/);
  assert.match(settings, /Changing the preference here will not change this project/);
  assert.match(settings, /disabled=\{busy \|\| !preferenceReady\}/);
  assert.match(settings, /Escape/);
});

test('New resets the project and starts from the saved language preference', () => {
  const reset = builder.split('function reset() {')[1]?.split('\n  }')[0] || '';
  assert.match(reset, /setFiles\(\{\}\)/);
  assert.match(reset, /setHistory\(\[\]\)/);
  assert.match(reset, /setPane\('prompt'\)/);
  assert.match(reset, /setLanguage\(languagePreference\)/);
});

test('Builder pane and project-view controls expose accessible selected states', () => {
  assert.match(builder, /className="seg" role="group" aria-label="Workspace pane selection"/);
  assert.match(builder, /aria-pressed=\{pane === 'prompt'\}/);
  assert.match(builder, /aria-pressed=\{pane === 'preview'\}/);
  assert.match(builder, /className="tabs" role="group" aria-label="Project view"/);
  assert.match(builder, /aria-pressed=\{view === 'preview'\}/);
  assert.match(builder, /aria-pressed=\{view === 'code'\}/);
  assert.match(builder, /className="bw-template-tabs" role="tablist"/);
  assert.doesNotMatch(settings, /role="tablist"|role="tab"|aria-selected=/);
});

test('source-only projects never enter the browser preview and explain the boundary in both panes', () => {
  assert.match(builder, /if \(sourceOnly\) return ''/);
  assert.match(builder, /setView\(isSourceOnlyLanguage\(projectLanguage\) \? 'code' : 'preview'\)/);
  assert.match(builder, /source-only-preview/);
  assert.match(builder, /source-export-note/);
  assert.match(builder, /SYNTHCODE is generating text files; it is not compiling or running this project/);
  assert.match(builder, /Download project ZIP/);
  assert.match(builder, /sourceProjectIssue\(files, language\)/);
  assert.match(builder, /sourceProjectRetry\(projectLanguage\)/);
});

test('mobile keeps the pre-generation source-only notice visible', () => {
  assert.match(builder, /sourceOnly \? ' source-only-tools' : ''/);
  const genericHide = css.indexOf('.tools span{display:none}');
  const sourceOnlyOverride = css.indexOf('.tools.source-only-tools span{display:block');
  assert.ok(genericHide >= 0 && sourceOnlyOverride > genericHide, 'the mobile source-only rule must override hidden generic helper text');
});

test('Assistant and SYNTHCODE workspace controls wrap safely on small screens', () => {
  assert.match(css, /\.build\{grid-template-columns:minmax\(320px,min\(480px,32vw\)\) minmax\(0,1fr\)\}/);
  assert.match(builder, /className="builder-stage-settings"/);
  assert.match(css, /@media\(max-width:1100px\)\{\.builder-stage-settings\{display:flex\}\}/);
  assert.match(css, /\.chat \.tools>span\{display:block/);
  assert.match(css, /@media\(max-width:640px\)[\s\S]*?\.build \.stagebar\{flex-wrap:wrap/);
  assert.match(css, /padding:0 12px calc\(10px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.builder-settings-panel\{[\s\S]*?border-radius:22px 22px 0 0/);
  assert.match(css, /@media\(max-width:380px\)/);
});

test('one combined multi-language release banner is shown after the previous version was dismissed', () => {
  assert.match(banner, /synth-capabilities-banner-v2/);
  assert.match(banner, /Python, Rust, Go, C\+\+ and Node\.js backend/);
  assert.match(banner, /dev-updates\/synthcode-multilanguage-projects/);
  assert.match(updates, /slug: 'synthcode-multilanguage-projects'/);
  assert.match(updates, /does not install dependencies, compile, test, run, host, or deploy/);
});
