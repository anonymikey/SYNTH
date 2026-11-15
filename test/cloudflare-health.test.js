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

test('admin health reports APInex as a free-text fallback and flags repeated failures', () => {
  const apinexCfg = { ...cfg, active: ['apinex'], apinex: 'enabled' };
  const healthy = providerHealth(apinexCfg, [{ provider: 'apinex', status: 'Fallback', ts: 9876, fails: [] }]);
  assert.equal(healthy.apinex.state, 'enabled');
  assert.equal(healthy.apinex.label, 'Enabled · free text only');
  assert.equal(healthy.apinex.served, 1);

  const failed = providerHealth(apinexCfg, [1, 2, 3].map((ts) => ({ provider: 'other', status: 'Failed', ts, fails: [{ provider: 'apinex' }] })));
  assert.equal(failed.apinex.state, 'warn');
  assert.match(failed.notes.join(' '), /account-wide rate and quota cooldowns/);
});

test('realtime health reflects only actual provider outcomes within the rolling 15-minute window', () => {
  const now = 1_000_000_000;
  const recentSuccess = providerHealth(cfg, [{ provider: 'cloudflare', status: 'Fallback', ts: now - 2_000, fails: [] }], now);
  assert.equal(recentSuccess.cloudflare.realtime.state, 'healthy');
  assert.equal(recentSuccess.cloudflare.recentServed, 1);

  const recentFailure = providerHealth(cfg, [{ provider: 'other', status: 'Failed', ts: now - 1_000, fails: [{ provider: 'cloudflare', status: 429, msg: 'rate limited' }] }], now);
  assert.equal(recentFailure.cloudflare.realtime.state, 'degraded');
  assert.equal(recentFailure.cloudflare.recentFailed, 1);
  assert.equal(recentFailure.cloudflare.lastError, 'rate limited');

  const down = providerHealth(cfg, [1, 2, 3].map((offset) => ({ provider: 'other', status: 'Failed', ts: now - offset * 1_000, fails: [{ provider: 'cloudflare', status: 503, msg: 'unavailable' }] })), now);
  assert.equal(down.cloudflare.realtime.state, 'down');

  const idle = providerHealth(cfg, [{ provider: 'cloudflare', status: 'Success', ts: now - 16 * 60 * 1_000, fails: [] }], now);
  assert.equal(idle.cloudflare.realtime.state, 'idle');
  assert.equal(idle.cloudflare.lastOk, now - 16 * 60 * 1_000);

  const disabled = providerHealth({ ...cfg, active: [], cloudflare: 'disabled' }, [], now);
  assert.equal(disabled.cloudflare.realtime.state, 'disabled');
  const unrouted = providerHealth({ ...cfg, active: [] }, [], now);
  assert.equal(unrouted.cloudflare.realtime.state, 'unrouted');
  const missing = providerHealth({ ...cfg, active: [], cloudflare: 'missing' }, [], now);
  assert.equal(missing.cloudflare.realtime.state, 'missing');
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
