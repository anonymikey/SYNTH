import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_PERSONALIZATION, PERSONALIZATION_OPTIONS, normalizePersonalization, applyPersonalization, isSafeWallpaperDataUrl, isSupportedWallpaperFile, MAX_WALLPAPER_SOURCE_BYTES } from '../lib/personalization.js';

const settings = readFileSync(new URL('../components/Personalization.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('personalization accepts valid settings and safely defaults unknown or malformed values', () => {
  assert.deepEqual(normalizePersonalization({ theme: 'light', accent: 'rose', font: 'serif', textSize: 'large', chatStyle: 'minimal', density: 'compact', extra: 'ignored' }), {
    theme: 'light', accent: 'rose', font: 'serif', textSize: 'large', chatStyle: 'minimal', density: 'compact', wallpaper: '', wallpaperDim: 45,
  });
  assert.deepEqual(normalizePersonalization({ theme: 'made-up', accent: null, font: 23 }), DEFAULT_PERSONALIZATION);
  assert.deepEqual(normalizePersonalization(null), DEFAULT_PERSONALIZATION);
});

test('selected personalization is reflected in root data attributes for CSS behavior', () => {
  const root = { dataset: {} };
  applyPersonalization({ theme: 'system', accent: 'emerald', font: 'mono', textSize: 'small', chatStyle: 'solid', density: 'compact' }, root);
  assert.deepEqual(root.dataset, { theme: 'system', accent: 'emerald', font: 'mono', textSize: 'small', chatStyle: 'solid', density: 'compact', wallpaper: 'none' });
});

test('theme preferences include Dark, Light, System and the expanded SYNTH palette choices', () => {
  assert.deepEqual(PERSONALIZATION_OPTIONS.theme, ['midnight', 'light', 'system', 'aurora', 'obsidian', 'ember', 'forest']);
  for (const title of ['Dark', 'Light', 'System', 'Aurora', 'Obsidian', 'Ember', 'Forest']) assert.match(settings, new RegExp(`title: '${title}'`));
  assert.match(settings, /toast: 'Switching off the lights'/);
  assert.match(settings, /role="status" aria-live="polite"/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*?\.theme-transition-toast/);
  assert.match(css, /html\[data-theme="light"\][\s\S]*?--file-pane-bg:#f5f7fb/);
  assert.match(css, /@media\(prefers-color-scheme:light\)[\s\S]*?html\[data-theme="system"\][\s\S]*?--file-pane-bg:#f5f7fb/);
  assert.match(css, /\.editor\{background:var\(--file-pane-bg\);color:var\(--file-editor-ink\)\}/);
});

test('wallpaper normalization accepts only bounded raster data and clamps its readability overlay', () => {
  const safe = 'data:image/webp;base64,U0FGRQ==';
  assert.equal(isSafeWallpaperDataUrl(safe), true);
  assert.equal(isSafeWallpaperDataUrl('data:image/svg+xml;base64,PHN2Zz4='), false);
  assert.equal(isSafeWallpaperDataUrl(`data:image/webp;base64,${'A'.repeat(1_250_000)}`), false);
  assert.equal(isSupportedWallpaperFile({ type: 'image/jpeg', size: 2048 }), true);
  assert.equal(isSupportedWallpaperFile({ type: 'image/svg+xml', size: 2048 }), false);
  assert.equal(isSupportedWallpaperFile({ type: 'image/png', size: MAX_WALLPAPER_SOURCE_BYTES + 1 }), false);
  assert.deepEqual(normalizePersonalization({ wallpaper: safe, wallpaperDim: 87 }), { ...DEFAULT_PERSONALIZATION, wallpaper: safe, wallpaperDim: 80 });
  assert.deepEqual(normalizePersonalization({ wallpaper: 'https://example.com/wallpaper.jpg', wallpaperDim: -4 }), { ...DEFAULT_PERSONALIZATION, wallpaperDim: 0 });
  assert.equal(normalizePersonalization({ wallpaperDim: '60' }).wallpaperDim, DEFAULT_PERSONALIZATION.wallpaperDim);
});

test('wallpaper is applied only to the local document root and never changes API or notification settings', () => {
  const properties = new Map();
  const root = {
    dataset: {},
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key) },
  };
  const wallpaper = 'data:image/webp;base64,U0FGRQ==';
  applyPersonalization({ ...DEFAULT_PERSONALIZATION, wallpaper, wallpaperDim: 55, theme: 'ember' }, root);
  assert.equal(root.dataset.theme, 'ember');
  assert.equal(root.dataset.wallpaper, 'custom');
  assert.equal(properties.get('--workspace-wallpaper'), `url("${wallpaper}")`);
  assert.equal(properties.get('--wallpaper-dim'), '0.55');
  assert.match(settings, /never uploaded/);
  assert.match(css, /html\[data-wallpaper="custom"\] body::before/);
});
