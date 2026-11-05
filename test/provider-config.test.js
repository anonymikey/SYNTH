import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { providerConfig, cloudflareBase, cloudflareAccountProblem } from '../lib/env.js';

const names = ['AI_API_KEY', 'AI_BASE_URL', 'ENABLE_SPARK', 'SPARK_BASE_URL', 'SPARK_API_KEY', 'ENABLE_CLOUDFLARE', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'PROVIDER_ORDER', 'GATEWAY_MODE'];
const previous = Object.fromEntries(names.map((k) => [k, process.env[k]]));
beforeEach(() => {
  for (const k of names) delete process.env[k];
  process.env.AI_API_KEY = 'sk-openrouter-example-key-long-enough';
});
afterEach(() => {
  for (const k of names) {
    if (previous[k] === undefined) delete process.env[k];
    else process.env[k] = previous[k];
  }
});

function enableCloudflare() {
  process.env.ENABLE_CLOUDFLARE = 'true';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'a'.repeat(32);
  process.env.CLOUDFLARE_API_TOKEN = 'cf-test-token-long-enough';
}

test('defaults to OpenRouter and lists optional providers last', () => {
  const cfg = providerConfig();
  assert.deepEqual(cfg.active, ['openrouter']);
  assert.deepEqual(cfg.order, ['openrouter', 'spark', 'cloudflare']);
  assert.equal(cfg.cloudflare, 'disabled');
});

test('Cloudflare can be placed first when enabled and configured', () => {
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'cloudflare,openrouter,spark';
  const cfg = providerConfig();
  assert.deepEqual(cfg.active, ['cloudflare', 'openrouter']);
  assert.equal(cfg.cloudflare, 'enabled');
  assert.equal(cloudflareAccountProblem(), '');
  assert.equal(cloudflareBase(), `https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/ai/v1`);
});

test('misconfigured Cloudflare is skipped without disabling OpenRouter', () => {
  process.env.ENABLE_CLOUDFLARE = 'true';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'not-an-account-id';
  const cfg = providerConfig();
  assert.deepEqual(cfg.active, ['openrouter']);
  assert.equal(cfg.cloudflare, 'missing');
  assert.match(cfg.notes.join(' '), /CLOUDFLARE_ACCOUNT_ID/);
});

test('legacy SPARK primary mode retains Cloudflare as the next configured fallback', () => {
  enableCloudflare();
  process.env.ENABLE_SPARK = 'true';
  process.env.SPARK_BASE_URL = 'https://spark.example/v1';
  process.env.SPARK_API_KEY = 'freellmapi-example-key';
  process.env.GATEWAY_MODE = 'primary';
  const cfg = providerConfig();
  assert.deepEqual(cfg.order, ['spark', 'openrouter', 'cloudflare']);
  assert.deepEqual(cfg.active, ['spark', 'openrouter', 'cloudflare']);
});

test('unknown configured providers are ignored and a healthy provider remains active', () => {
  process.env.PROVIDER_ORDER = 'unknown,openrouter';
  const cfg = providerConfig();
  assert.deepEqual(cfg.active, ['openrouter']);
  assert.match(cfg.notes.join(' '), /unknown provider/);
});
