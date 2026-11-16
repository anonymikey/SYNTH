import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../components/BuilderLanguageSettings.js', import.meta.url), 'utf8');
const banner = readFileSync(new URL('../components/CapabilityBanner.js', import.meta.url), 'utf8');
const updates = readFileSync(new URL('../app/dev-updates/data.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const explorer = readFileSync(new URL('../components/FileExplorer.js', import.meta.url), 'utf8');
const approval = readFileSync(new URL('../components/BuilderApprovalDialog.js', import.meta.url), 'utf8');

test('Auto is the default and the same SYNTHCODE generation pipeline resolves the project mode', () => {
  assert.match(builder, /useState\('auto'\)/);
  assert.match(builder, /requestedLanguage === 'auto' \? autoProjectPrompt\(\)/);
  assert.match(builder, /resolveProjectMode\(reply, merged\.files\)/);
  assert.match(builder, /mode: 'build'/);
  assert.match(builder, /stripProjectModeMarker\(reply\)/);
  assert.match(builder, /setLanguage\(projectLanguage\)/);
});

test('every fresh project receives the shared browser-page standard and format retries retain it', () => {
  assert.match(builder, /withWebProjectVisualGuidance\(baseSystem, \{ existingRepository: isGitHubProject \}\)/);
  assert.match(builder, /streamChat\(\{ messages: user, system, mode: 'build' \}/);
  assert.match(builder, /streamChat\(\{ messages: user, system: system \+ reminder, mode: 'build', retry: true \}/);
  assert.match(builder, /complete index\.html with CSS embedded in a <style> block/);
  assert.match(builder, /When adding browser-facing UI, make it fully styled, responsive, and accessible using the repository's existing design system/);
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
  assert.match(builder, /className="workspace-splitter" role="separator" aria-orientation="vertical"/);
  assert.match(builder, /aria-valuemin="340" aria-valuemax="520" aria-valuenow=\{assistantWidth\}/);
  assert.match(builder, /className="builder-view-tabs" role="group" aria-label="Project view"/);
  assert.match(builder, /aria-pressed=\{view === 'preview'\}/);
  assert.match(builder, /aria-pressed=\{view === 'code'\}/);
  assert.match(builder, /aria-pressed=\{view === 'files'\}/);
  assert.match(builder, /className="builder-mobile-nav" aria-label="SYNTHCODE workspace views"/);
  assert.match(builder, /activateMobileTab\('chat'\)/);
  assert.match(builder, /activateMobileTab\('preview'\)/);
  assert.match(builder, /activateMobileTab\('code'\)/);
  assert.match(builder, /className="bw-template-tabs" role="tablist"/);
  assert.doesNotMatch(settings, /role="tablist"|role="tab"|aria-selected=/);
});

test('source-only projects never enter the browser preview and explain the boundary in both panes', () => {
  assert.match(builder, /if \(sourceOnly\) return ''/);
  assert.match(builder, /const resultView = isSourceOnlyLanguage\(projectLanguage\) \|\| \(githubRepository && !githubPreviewApproved\) \? 'code' : 'preview'/);
  assert.match(builder, /setView\(resultView\); setPane\('preview'\); setMobileTab\(resultView === 'code' \? 'code' : 'preview'\)/);
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
  assert.match(css, /\.build\{position:relative;display:grid!important;grid-template-columns:minmax\(0,var\(--assistant-width,400px\)\) 12px minmax\(0,1fr\)/);
  assert.match(builder, /className="builder-topbar"/);
  assert.match(builder, /className="builder-menu-button" onClick=\{onOpenMenu\}/);
  assert.match(css, /@media\(max-width:900px\)\{[\s\S]*?\.build\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.builder-mobile-nav\{grid-column:1;grid-row:4;display:grid/);
  assert.match(css, /\.chat \.tools>span\{display:block/);
  assert.match(css, /padding:6px 12px calc\(6px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(css, /\.builder-settings-panel\{[\s\S]*?border-radius:22px 22px 0 0/);
  assert.match(css, /@media\(max-width:380px\)/);
  assert.match(css, /\.builder-topbar\{grid-template-columns:40px minmax\(92px,1fr\) minmax\(104px,1\.1fr\) 80px;column-gap:4px\}/);
  assert.match(css, /\.builder-topbar-actions>button\.iconbtn\.sm\{width:40px;height:40px;min-width:40px;min-height:40px\}/);
  assert.match(css, /\.compose-toolbar\.builder-toolbar button\{height:40px;min-height:40px\}/);
  assert.match(css, /\.build \.notification-nudge-actions>\.notification-nudge-dismiss\{width:40px;height:40px;min-width:40px;min-height:40px\}/);
});

test('Code view collapses file navigation by default but keeps accessible browse and hide controls', () => {
  assert.match(explorer, /useState\(false\);\s+const \[editing/);
  assert.match(explorer, /className="ftree" hidden=\{!treeOpen\}/);
  assert.match(explorer, /filesOnly \? 'Return to Code' : 'Hide file navigation'/);
  assert.match(explorer, /aria-label="Browse project files"/);
  assert.match(explorer, /onClick=\{showFiles\}/);
  assert.match(css, /\.ftree\[hidden\]\{display:none!important\}/);
});

test('closed-tree editor remains visible and phone controls wrap without page-width overflow', () => {
  assert.match(css, /\.exin:not\(\.files-only\)>\.fview\{grid-column:2\}/);
  assert.match(css, /\.compose-toolbar\.builder-toolbar>\.toolbar-cluster\{display:flex;flex:1 0 100%/);
  assert.match(css, /@media\(max-width:900px\)\{\.device-option span\{display:none\}\}/);
  assert.match(css, /\.builder-view-tabs>button,\.builder-next-step,\.build \.linkbtn\{min-height:40px\}/);
});

test('SYNTHCODE asks before sensitive work, reviews unexpected sensitive paths and gives useful next steps', () => {
  assert.match(builder, /criticalChangeReason\(text\)/);
  assert.match(builder, /criticalChangedPaths\(merged\.changed\)/);
  assert.match(builder, /confirmedCritical/);
  assert.match(builder, /COLLABORATION_GUIDANCE/);
  assert.match(builder, /Recent project conversation for continuity/);
  assert.match(builder, /status === 'needs_input'/);
  assert.match(builder, /isExplanationRequest\(text\)/);
  assert.match(builder, /Good next steps/);
  assert.match(approval, /role="dialog" aria-modal="true"/);
  assert.match(approval, /Yes, proceed/);
  assert.match(approval, /Current/);
  assert.match(approval, /Proposed/);
  assert.match(builder, /originalFiles: files/);
  assert.match(builder, /setFiles\(pending\.files\)/);
  assert.match(approval, /Apply reviewed changes/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.builder-approval-backdrop/);
});

test('one combined multi-language release banner is shown after the previous version was dismissed', () => {
  assert.match(banner, /synth-capabilities-banner-v2/);
  assert.match(banner, /Python, Rust, Go, C\+\+ and Node\.js backend/);
  assert.match(banner, /dev-updates\/synthcode-multilanguage-projects/);
  assert.match(updates, /slug: 'synthcode-multilanguage-projects'/);
  assert.match(updates, /does not install dependencies, compile, test, run, host, or deploy/);
});
