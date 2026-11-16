import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_PERSONALIZATION, PERSONALIZATION_OPTIONS, normalizePersonalization } from '../lib/personalization.js';

const app = readFileSync(new URL('../app/app/page.js', import.meta.url), 'utf8');
const background = readFileSync(new URL('../components/WorkspaceBackground.js', import.meta.url), 'utf8');
const component = readFileSync(new URL('../components/Antigravity.js', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../components/Personalization.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../app/layout.js', import.meta.url), 'utf8');

test('one Antigravity canvas uses the configured values behind both workspace tabs', () => {
  for (const value of ["colors={['#5227FF', '#FF9FFC', '#B497CF']}", 'count={1500}', 'magnetRadius={9}', 'ringRadius={7}', 'particleSize={0.9}', 'autoAnimate={true}']) {
    assert.ok(background.includes(value), `missing configured value: ${value}`);
  }
  assert.match(app, /backgroundEffect === 'antigravity' && <WorkspaceBackground \/>/);
  assert.match(app, /className="workspace-view chat-workspace"/);
  assert.match(app, /className="workspace-view builder-workspace"/);
  assert.match(css, /\.workspace-background\{position:absolute;inset:0;z-index:-1/);
  assert.match(css, /\.workspace-background\{[^}]*pointer-events:none/);
  assert.match(layout, /\.\.\/components\/Antigravity\.css/);
  assert.match(component, /className="antigravity__canvas" aria-hidden="true"/);
});

test('background selection is persisted additively and old theme and wallpaper choices survive normalization', () => {
  assert.equal(DEFAULT_PERSONALIZATION.backgroundEffect, 'antigravity');
  assert.deepEqual(PERSONALIZATION_OPTIONS.backgroundEffect, ['antigravity', 'static']);
  const wallpaper = 'data:image/webp;base64,U0FGRQ==';
  const saved = normalizePersonalization({ theme: 'ember', accent: 'rose', font: 'serif', wallpaper, wallpaperDim: 60 });
  assert.equal(saved.theme, 'ember');
  assert.equal(saved.accent, 'rose');
  assert.equal(saved.font, 'serif');
  assert.equal(saved.wallpaper, wallpaper);
  assert.equal(saved.wallpaperDim, 60);
  assert.equal(saved.backgroundEffect, 'antigravity');
  assert.match(settings, /Workspace background effect/);
  assert.match(settings, /onBackgroundEffectChange/);
  assert.match(settings, /STORAGE_KEY = 'synth-personalization-v1'/);
});

test('the effect respects reduced motion, tab visibility and offscreen cleanup while retaining a static CSS fallback', () => {
  assert.match(component, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(component, /if \(visible && pageVisible && !reduced\) raf = requestAnimationFrame\(frame\)/);
  assert.match(component, /motionQuery\.addEventListener\('change', onMotionChange\)/);
  assert.match(component, /motionQuery\.removeEventListener\('change', onMotionChange\)/);
  assert.match(component, /new IntersectionObserver/);
  assert.match(component, /document\.addEventListener\('visibilitychange', onVisibility\)/);
  assert.match(css, /body::before\{content:"";position:fixed/);
  assert.match(css, /html\[data-wallpaper="custom"\] body::before/);
});
