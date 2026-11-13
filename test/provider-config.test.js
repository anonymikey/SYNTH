import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { providerConfig, cloudflareBase, cloudflareAccountProblem } from '../lib/env.js';

const names = ['AI_API_KEY', 'AI_BASE_URL', 'ENABLE_SPARK', 'SPARK_BASE_URL', 'SPARK_API_KEY', 'ENABLE_CLOUDFLARE', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'ENABLE_UNOROUTER', 'UNOROUTER_API_KEY', 'UNOROUTER_FREE_MODELS', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'PROVIDER_ORDER', 'GATEWAY_MODE'];
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
  assert.deepEqual(cfg.order, ['openrouter', 'spark', 'cloudflare', 'unorouter']);
  assert.equal(cfg.cloudflare, 'disabled');
  assert.equal(cfg.unorouter, 'disabled');
});

test('UnoRouter is opt-in, configured with a server key, and can be ordered as a fallback', () => {
  process.env.ENABLE_UNOROUTER = 'true';
  process.env.UNOROUTER_API_KEY = '  Bearer uno-test-key  ';
  process.env.UNOROUTER_FREE_MODELS = 'deepseek-v4.1-flash:free,gpt-oss-120b:free';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.PROVIDER_ORDER = 'openrouter,unorouter';
  const cfg = providerConfig();
  assert.equal(cfg.unorouter, 'enabled');
  assert.equal(cfg.wantedUnorouter, true);
  assert.deepEqual(cfg.active, ['openrouter', 'unorouter']);
  assert.match(cfg.notes.join(' '), /free-only/);
});

test('UnoRouter remains unavailable without shared storage for safe cross-instance rate limiting', () => {
  process.env.ENABLE_UNOROUTER = 'true';
  process.env.UNOROUTER_API_KEY = 'uno-test-key';
  assert.equal(providerConfig().unorouter, 'missing');
  assert.match(providerConfig().notes.join(' '), /shared workspace storage/);
});

test('an enabled UnoRouter omitted from an explicit provider order is never activated implicitly', () => {
  process.env.ENABLE_UNOROUTER = 'true';
  process.env.UNOROUTER_API_KEY = 'uno-test-key';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
  process.env.PROVIDER_ORDER = 'openrouter';
  process.env.AI_API_KEY = '';
  const cfg = providerConfig();
  assert.deepEqual(cfg.order, ['openrouter']);
  assert.deepEqual(cfg.active, []);
  assert.match(cfg.notes.join(' '), /UnoRouter is enabled but not listed/);
});

test('UnoRouter skips paid-only or malformed model configuration', () => {
  process.env.ENABLE_UNOROUTER = 'true';
  process.env.UNOROUTER_API_KEY = 'uno-test-key';
  process.env.UNOROUTER_FREE_MODELS = 'gpt-oss-120b,paid-model';
  const cfg = providerConfig();
  assert.equal(cfg.unorouter, 'missing');
  assert.deepEqual(cfg.active, ['openrouter']);
  assert.match(cfg.notes.join(' '), /:free/);
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
  assert.deepEqual(cfg.order, ['spark', 'openrouter', 'cloudflare', 'unorouter']);
  assert.deepEqual(cfg.active, ['spark', 'openrouter', 'cloudflare']);
});

test('unknown configured providers are ignored and a healthy provider remains active', () => {
  process.env.PROVIDER_ORDER = 'unknown,openrouter';
  const cfg = providerConfig();
  assert.deepEqual(cfg.active, ['openrouter']);
  assert.match(cfg.notes.join(' '), /unknown provider/);
});
