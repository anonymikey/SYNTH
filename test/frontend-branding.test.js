import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { modelLabel, providerLabel, safeFrontendText, serviceNodeLabel } from '../lib/brand-view.js';

test('provider labels are SYNTH-branded and hide backend service names', () => {
  assert.equal(providerLabel('openrouter'), 'SYNTH Core');
  assert.equal(providerLabel('spark'), 'SYNTH Relay');
  assert.equal(providerLabel('cloudflare'), 'SYNTH Image Master');
  assert.equal(providerLabel('unknown'), 'SYNTH service');
});

test('model aliases are stable and never include the model identifier', () => {
  const raw = 'openrouter/google/gemma-4-26b-a4b-it:free';
  const label = modelLabel(raw);
  assert.match(label, /^SYNTH Model [A-Z0-9]+$/);
  assert.equal(modelLabel(raw), label);
  assert.ok(!label.toLowerCase().includes('google'));
  assert.ok(!label.toLowerCase().includes('gemma'));
  assert.ok(!serviceNodeLabel('cloudflare/@cf/meta/llama-4-scout-17b-16e-instruct').toLowerCase().includes('llama'));
});

test('dynamic frontend diagnostics redact providers, model IDs, credentials and settings names', () => {
  const rendered = safeFrontendText('Cloudflare Workers AI error for @cf/meta/llama-4-scout-17b. OpenRouter google/gemma-4:free; ADMIN_PASSWORD missing; Bearer secretvalue12345678901234567890');
  for (const hidden of ['Cloudflare', 'Workers AI', '@cf/', 'llama-4', 'OpenRouter', 'google/gemma', 'ADMIN_PASSWORD', 'secretvalue']) {
    assert.ok(!rendered.toLowerCase().includes(hidden.toLowerCase()), `did not hide ${hidden}: ${rendered}`);
  }
  assert.match(rendered, /SYNTH Image Master/);
  assert.match(rendered, /SYNTH Core/);
  assert.match(rendered, /workspace settings/);
  assert.match(rendered, /credential hidden/);
});

test('public pages use SYNTH branding instead of exposing service names', () => {
  const files = [
    '../components/Chat.js',
    '../components/Builder.js',
    '../components/CapabilityBanner.js',
    '../components/ResponseToolbar.js',
    '../components/landing/Landing.js',
    '../app/page.js',
    '../app/dev-updates/data.js',
  ];
  const publicCopy = files.map((file) => readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
  assert.match(publicCopy, /SYNTH Image Master/);
  assert.match(publicCopy, /SYNTH Learning Studio/);
  for (const hidden of [/Cloudflare Workers AI/i, /OpenRouter/i, /\bSPARK\b/i, /Llama|Qwen|DeepSeek|Mistral|Gemma/i, /free-tier models/i, /\badmin(?:istrator)?s?\b/i]) {
    assert.doesNotMatch(publicCopy, hidden);
  }
});
