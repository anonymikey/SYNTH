import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnoFreeModelId,
  parseUnoRetryAfter,
  unorouterBase,
  unorouterFreeModels,
  unorouterKey,
} from '../lib/unorouter.js';

const envNames = [
  'AI_API_KEY', 'AI_BASE_URL', 'ENABLE_SPARK', 'SPARK_BASE_URL', 'SPARK_API_KEY',
  'ENABLE_CLOUDFLARE', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN',
  'ENABLE_UNOROUTER', 'UNOROUTER_API_KEY', 'UNOROUTER_FREE_MODELS',
  'PROVIDER_ORDER', 'GATEWAY_MODE', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
];
const originalEnv = Object.fromEntries(envNames.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

beforeEach(() => { for (const key of envNames) delete process.env[key]; });
afterEach(() => {
  for (const key of envNames) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

test('UnoRouter only accepts free-suffix model IDs and never reads a client-controlled host', () => {
  process.env.UNOROUTER_FREE_MODELS = 'openai/gpt-oss-120b:free,paid-model,deepseek/deepseek-v4.1-flash-1017:free,openai/gpt-oss-120b:free';
  process.env.UNOROUTER_API_KEY = '  Bearer uno-server-secret  ';
  assert.equal(unorouterBase(), 'https://api.unorouter.com/v1');
  assert.equal(unorouterKey(), 'uno-server-secret');
  assert.equal(isUnoFreeModelId('openai/gpt-oss-120b:free'), true);
  assert.equal(isUnoFreeModelId('gpt-oss-120b'), false);
  assert.equal(isUnoFreeModelId('paid:model:free'), false);
  assert.deepEqual(unorouterFreeModels(), ['openai/gpt-oss-120b:free', 'deepseek/deepseek-v4.1-flash-1017:free']);
});

test('UnoRouter Retry-After parser supports seconds and HTTP-date and bounds invalidly long values', () => {
  const now = Date.UTC(2026, 10, 10, 0, 0, 0);
  assert.equal(parseUnoRetryAfter('45', now), 45000);
  assert.equal(parseUnoRetryAfter(new Date(now + 90000).toUTCString(), now), 90000);
  assert.equal(parseUnoRetryAfter('not-a-date', now), 0);
  assert.equal(parseUnoRetryAfter('999999999', now), 24 * 60 * 60 * 1000);
});

test('429 free-model response honors Retry-After, persists cooldown, and immediately falls back to OpenRouter', async () => {
  process.env.AI_API_KEY = 'sk-openrouter-example-key-long-enough';
  process.env.ENABLE_UNOROUTER = 'true';
  process.env.UNOROUTER_API_KEY = 'uno-test-server-key';
  process.env.UNOROUTER_FREE_MODELS = 'openai/gpt-oss-120b:free';
  process.env.PROVIDER_ORDER = 'unorouter,openrouter';
  const redisUrl = 'https://redis-unorouter-test.invalid';
  process.env.UPSTASH_REDIS_REST_URL = redisUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test-token';

  const redis = new Map();
  const providerCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    if (url === redisUrl) {
      const command = JSON.parse(init.body);
      if (command[0] === 'MGET') return Response.json({ result: command.slice(1).map((key) => redis.get(key) ?? null) });
      if (command[0] === 'EVAL') {
        redis.set(command[3], command[4]);
        return Response.json({ result: Number(command[4]) });
      }
      if (command[0] === 'SET') {
        if (command.includes('NX') && redis.has(command[1])) return Response.json({ result: null });
        redis.set(command[1], command[2]);
        return Response.json({ result: 'OK' });
      }
      return Response.json({ result: 1 });
    }

    if (String(url).startsWith('https://openrouter.ai/api/v1/models')) {
      return Response.json({ data: [{ id: 'openai/gpt-oss-20b:free', name: 'Open free model', context_length: 32000 }] });
    }

    const body = init.body ? JSON.parse(init.body) : {};
    if (String(url).startsWith('https://api.unorouter.com/v1/chat/completions')) {
      providerCalls.push({ provider: 'unorouter', url, body, authorization: init.headers.Authorization });
      return Response.json({ error: { message: 'Rate limited' } }, { status: 429, headers: { 'retry-after': '90' } });
    }
    if (String(url).startsWith('https://openrouter.ai/api/v1/chat/completions')) {
      providerCalls.push({ provider: 'openrouter', url, body });
      return new Response('data: {"choices":[{"delta":{"content":"served by existing fallback"}}]}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'x-routed-via': 'openrouter/model-free' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };
  console.warn = () => {};

  const { route } = await import('../lib/spark.js?unorouter-test');
  const input = { mode: 'chat', task: 'general', hasImg: false, payload: [{ role: 'user', content: 'hello' }], budgetMs: 5000 };
  const [first, concurrent] = await Promise.all([route(input), route(input)]);
  assert.equal(first.ok, true);
  assert.equal(concurrent.ok, true);
  assert.match(await new Response(first.stream).text(), /served by existing fallback/);
  assert.match(await new Response(concurrent.stream).text(), /served by existing fallback/);
  assert.equal(providerCalls.filter((call) => call.provider === 'unorouter').length, 1);
  assert.equal(providerCalls.filter((call) => call.provider === 'openrouter').length, 2);
  const unoCall = providerCalls.find((call) => call.provider === 'unorouter');
  assert.equal(unoCall.body.model, 'openai/gpt-oss-120b:free');
  assert.equal(unoCall.authorization, 'Bearer uno-test-server-key');
  const cooldownKey = 'chat:cooldown:unorouter:model:openai%2Fgpt-oss-120b%3Afree';
  assert.ok(Number(redis.get(cooldownKey)) > Date.now() + 80000);

  // Simulate a fresh function instance: retain shared storage but clear process-local cooldown state.
  globalThis.__synthUnoCool?.clear();
  const second = await route({ mode: 'build', task: 'new-build', hasImg: false, payload: [{ role: 'user', content: 'build' }], budgetMs: 5000 });
  assert.equal(second.ok, true);
  assert.equal(providerCalls.filter((call) => call.provider === 'unorouter').length, 1);
  assert.equal(providerCalls.filter((call) => call.provider === 'openrouter').length, 3);

  process.env.UNOROUTER_FREE_MODELS = 'nemotron-3.5-super-vl:free';
  process.env.PROVIDER_ORDER = 'unorouter';
  const image = await route({ mode: 'chat', task: 'image-reading', hasImg: true, payload: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } }] }], budgetMs: 5000 });
  assert.equal(image.ok, false);
  assert.equal(image.noTargets, true);
  assert.equal(providerCalls.filter((call) => call.provider === 'unorouter').length, 1);

  process.env.AI_API_KEY = '';
  const { completeWith } = await import('../lib/ai.js?unorouter-learning-test');
  await assert.rejects(() => completeWith([{ role: 'user', content: 'Analyze learning data.' }]), /not used for training analysis/);
});
