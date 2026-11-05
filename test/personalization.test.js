import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PERSONALIZATION, normalizePersonalization, applyPersonalization } from '../lib/personalization.js';

test('personalization accepts valid settings and safely defaults unknown or malformed values', () => {
  assert.deepEqual(normalizePersonalization({ theme: 'light', accent: 'rose', font: 'serif', textSize: 'large', chatStyle: 'minimal', density: 'compact', extra: 'ignored' }), {
    theme: 'light', accent: 'rose', font: 'serif', textSize: 'large', chatStyle: 'minimal', density: 'compact',
  });
  assert.deepEqual(normalizePersonalization({ theme: 'made-up', accent: null, font: 23 }), DEFAULT_PERSONALIZATION);
  assert.deepEqual(normalizePersonalization(null), DEFAULT_PERSONALIZATION);
});

test('selected personalization is reflected in root data attributes for CSS behavior', () => {
  const root = { dataset: {} };
  applyPersonalization({ theme: 'system', accent: 'emerald', font: 'mono', textSize: 'small', chatStyle: 'solid', density: 'compact' }, root);
  assert.deepEqual(root.dataset, { theme: 'system', accent: 'emerald', font: 'mono', textSize: 'small', chatStyle: 'solid', density: 'compact' });
});
