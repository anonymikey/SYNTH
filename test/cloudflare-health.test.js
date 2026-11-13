import test from 'node:test';
import assert from 'node:assert/strict';
import { providerHealth } from '../lib/health.js';
import { TASKS } from '../lib/core.js';
import { CF_MODELS, cloudflareChatTarget } from '../lib/cloudflare.js';

const cfg = { order: ['cloudflare', 'openrouter', 'spark'], active: ['cloudflare'], notes: [], openrouter: 'missing', spark: 'disabled', cloudflare: 'enabled' };

test('admin health pill distinguishes configured Cloudflare from recent failures', () => {
  const healthy = providerHealth(cfg, [{ provider: 'cloudflare', status: 'Success', ts: 1234, fails: [] }]);
  assert.equal(healthy.cloudflare.state, 'enabled');
  assert.equal(healthy.cloudflare.served, 1);
  assert.equal(healthy.cloudflare.lastOk, 1234);

  const failed = providerHealth(cfg, [1, 2, 3].map((ts) => ({ provider: 'other', status: 'Failed', ts, fails: [{ provider: 'cloudflare' }] })));
  assert.equal(failed.cloudflare.state, 'warn');
  assert.equal(failed.cloudflare.failed, 3);
});

test('admin health reports UnoRouter as a free-text fallback and flags repeated failures', () => {
  const unoCfg = { ...cfg, active: ['unorouter'], unorouter: 'enabled' };
  const healthy = providerHealth(unoCfg, [{ provider: 'unorouter', status: 'Fallback', ts: 4321, fails: [] }]);
  assert.equal(healthy.unorouter.state, 'enabled');
  assert.equal(healthy.unorouter.label, 'Enabled · free text only');
  assert.equal(healthy.unorouter.served, 1);

  const failed = providerHealth(unoCfg, [1, 2, 3].map((ts) => ({ provider: 'other', status: 'Failed', ts, fails: [{ provider: 'unorouter' }] })));
  assert.equal(failed.unorouter.state, 'warn');
  assert.match(failed.notes.join(' '), /rate-limit cooldowns/);
});

test('image and voice tasks are included in SYNTHCORE task coverage', () => {
  assert.deepEqual(TASKS['image-generation'], ['Generating images', 'image']);
  assert.deepEqual(TASKS['speech-to-text'], ['Speech transcription', 'audio']);
});

test('Cloudflare routes ordinary chat and attached images to different eligible models', () => {
  process.env.CLOUDFLARE_ACCOUNT_ID = 'c'.repeat(32);
  process.env.CLOUDFLARE_API_TOKEN = 'test-token';
  assert.equal(cloudflareChatTarget(false).model, CF_MODELS.chat);
  assert.equal(cloudflareChatTarget(true).model, CF_MODELS.vision);
  assert.equal(cloudflareChatTarget(true).label, `cloudflare/${CF_MODELS.vision}`);
});
