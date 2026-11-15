import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  APINEX_ACCOUNT_COOLDOWN_KEY,
  APINEX_CIRCUIT_BREAKER_KEY,
  APINEX_MIN_REQUEST_INTERVAL_MS,
  apinexBase,
  apinexChatTargets,
  apinexFreeModels,
  apinexKey,
  isApinexFreeModelId,
  parseApinexCooldown,
  parseApinexResetAt,
  parseApinexRetryAfter,
  resetApinexCachesForTests,
} from '../lib/apinex.js';

const envNames = [
  'AI_API_KEY', 'AI_BASE_URL', 'DEFAULT_MODEL', 'ENABLE_SPARK', 'SPARK_BASE_URL', 'SPARK_API_KEY',
  'ENABLE_CLOUDFLARE', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN',
  'ENABLE_UNOROUTER', 'UNOROUTER_API_KEY', 'UNOROUTER_FREE_MODELS',
  'ENABLE_APINEX', 'APINEX_API_KEY', 'APINEX_FREE_MODELS',
  'PROVIDER_ORDER', 'GATEWAY_MODE', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
];
const originalEnv = Object.fromEntries(envNames.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

beforeEach(() => {
  for (const key of envNames) delete process.env[key];
  resetApinexCachesForTests();
});
afterEach(() => {
  for (const key of envNames) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  resetApinexCachesForTests();
});

const eligible = (id) => ({
  id,
  allowFree: true,
  health: 'live',
  dollarsPer1M: 0,
  outputDollarsPer1M: 0,
});

function enableApinex({ order = 'apinex,openrouter', redisUrl = 'https://redis-apinex-test.invalid' } = {}) {
  process.env.AI_API_KEY = 'sk-openrouter-example-key-long-enough';
  process.env.AI_BASE_URL = 'https://openrouter.test/v1';
  process.env.ENABLE_APINEX = 'true';
  process.env.APINEX_API_KEY = '  Bearer apinex-server-test-key  ';
  process.env.APINEX_FREE_MODELS = 'free/deepseek-v4.1-flash';
  process.env.UPSTASH_REDIS_REST_URL = redisUrl;
  process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-test-token';
  process.env.PROVIDER_ORDER = order;
}

test('APInex uses a fixed host, server key, and syntactically free model IDs only', () => {
  process.env.APINEX_API_KEY = ' Bearer server-only-test-key ';
  process.env.APINEX_FREE_MODELS = 'free/deepseek-v4.1-flash,paid/model,free/model:free,free/qwen-3.8-max';
  assert.equal(apinexBase(), 'https://api.apinex.bond/v1');
  assert.equal(apinexKey(), 'server-only-test-key');
  assert.deepEqual(apinexFreeModels(), ['free/deepseek-v4.1-flash', 'free/qwen-3.8-max']);
  assert.equal(isApinexFreeModelId('free/deepseek-v4.1-flash'), true);
  assert.equal(isApinexFreeModelId('deepseek-v4.1-flash'), false);
  assert.equal(isApinexFreeModelId('free/model:paid'), false);
  assert.equal(isApinexFreeModelId('free/model:free'), false);
});

test('APInex Retry-After and reset parsers accept documented seconds/date/Unix values and cap holds', () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  assert.equal(parseApinexRetryAfter('30', now), 30000);
  assert.equal(parseApinexRetryAfter(new Date(now + 90000).toUTCString(), now), 90000);
  assert.equal(parseApinexRetryAfter('not-a-date', now), 0);
  assert.equal(parseApinexRetryAfter('999999999', now), 24 * 60 * 60 * 1000);
  assert.equal(parseApinexResetAt(String(Math.floor((now + 60000) / 1000)), now), Math.floor((now + 60000) / 1000) * 1000);
  assert.equal(parseApinexResetAt('not-a-date', now), 0);
  assert.equal(parseApinexCooldown(new Headers({ 'retry-after': '20', 'x-ratelimit-reset': String(Math.floor((now + 60000) / 1000)) }), now), 60000);
});

test('APInex routes only catalog-confirmed live free models with exactly zero input and output prices', async () => {
  process.env.APINEX_API_KEY = 'server-only-test-key';
  process.env.APINEX_FREE_MODELS = 'free/paid,free/down,paid/zero,free/not-allowed,free/deepseek-v4.1-flash';
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(String(url));
    return Response.json({ models: [
      { ...eligible('free/paid'), dollarsPer1M: 0.01 },
      { ...eligible('free/down'), health: 'down' },
      eligible('paid/zero'),
      { ...eligible('free/not-allowed'), allowFree: false },
      eligible('free/deepseek-v4.1-flash'),
    ] });
  };
  const targets = await apinexChatTargets();
  assert.deepEqual(targets.map((target) => target.model), ['free/deepseek-v4.1-flash']);
  assert.equal(targets[0].base, 'https://api.apinex.bond/v1');
  assert.deepEqual(requested, ['https://apinex.bond/api/public/models']);
  assert.ok(!targets[0].label.includes('server-only-test-key'));
});

test('APInex revalidates its catalog between routing decisions instead of using stale free-price data', async () => {
  process.env.APINEX_API_KEY = 'server-only-test-key';
  process.env.APINEX_FREE_MODELS = 'free/deepseek-v4.1-flash';
  let liveModel = eligible('free/deepseek-v4.1-flash');
  let checks = 0;
  globalThis.fetch = async () => {
    checks += 1;
    return Response.json({ models: [liveModel] });
  };
  assert.equal((await apinexChatTargets()).length, 1);
  liveModel = { ...eligible('free/deepseek-v4.1-flash'), dollarsPer1M: 0.01 };
  assert.deepEqual(await apinexChatTargets(), []);
  assert.equal(checks, 2);
});

test('a verified free APInex model streams through the existing Assistant and SYNTHCODE routes', async () => {
  enableApinex({ order: 'apinex' });
  process.env.AI_API_KEY = '';
  globalThis.__provDown = new Map();
  globalThis.__synthModels = { t: 0, list: [] };
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redis = new Map();
  const requests = [];
  globalThis.fetch = async (url, init = {}) => {
    if (url === redisUrl) {
      const command = JSON.parse(init.body);
      if (command[0] === 'SET') {
        if (command.includes('NX') && redis.has(command[1])) return Response.json({ result: null });
        redis.set(command[1], command[2]);
        return Response.json({ result: 'OK' });
      }
      if (command[0] === 'EVAL') {
        redis.set(command[3], command[4]);
        return Response.json({ result: Number(command[4]) });
      }
      return Response.json({ result: 1 });
    }
    if (String(url) === 'https://apinex.bond/api/public/models') return Response.json({ models: [eligible('free/deepseek-v4.1-flash')] });
    if (String(url).startsWith('https://api.apinex.bond/v1/chat/completions')) {
      const body = JSON.parse(init.body);
      requests.push({ url: String(url), body, authorization: init.headers.Authorization });
      return new Response('data: {"choices":[{"delta":{"content":"served by verified free route"}}]}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const { route } = await import('../lib/spark.js?apinex-success-test');
  const chat = await route({ mode: 'chat', task: 'general', hasImg: false, payload: [{ role: 'user', content: 'hello' }], budgetMs: 5000 });
  assert.equal(chat.ok, true);
  assert.match(await new Response(chat.stream).text(), /served by verified free route/);
  redis.delete(APINEX_ACCOUNT_COOLDOWN_KEY);
  const build = await route({ mode: 'build', task: 'new-build', hasImg: false, payload: [{ role: 'user', content: 'build a page' }], budgetMs: 5000 });
  assert.equal(build.ok, true);
  assert.match(await new Response(build.stream).text(), /served by verified free route/);
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.url === 'https://api.apinex.bond/v1/chat/completions'));
  assert.ok(requests.every((request) => request.body.model === 'free/deepseek-v4.1-flash'));
  assert.ok(requests.every((request) => request.authorization === 'Bearer apinex-server-test-key'));
});

test('429 cooldown and shared atomic account reservation fall back to OpenRouter without exposing APInex errors', async () => {
  enableApinex();
  globalThis.__synthModels = { t: 0, list: [] };
  globalThis.__provDown = new Map();
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redis = new Map();
  const redisCommands = [];
  const providerCalls = [];
  const warnings = [];
  let quotaResponse = false;
  let redisDown = false;
  let evalDown = false;
  let apinexResponseCount = 0;
  console.warn = (...args) => warnings.push(args.join(' '));

  globalThis.fetch = async (url, init = {}) => {
    if (url === redisUrl) {
      if (redisDown) throw new Error('shared storage unavailable');
      const command = JSON.parse(init.body);
      redisCommands.push(command);
      if (command[0] === 'MGET') return Response.json({ result: command.slice(1).map((key) => redis.get(key) ?? null) });
      if (command[0] === 'GET') return Response.json({ result: redis.get(command[1]) ?? null });
      if (command[0] === 'EVAL') {
        if (evalDown) return Response.json({ error: 'atomic max-write unavailable' });
        const current = Number(redis.get(command[3])) || 0;
        const next = Math.max(current, Number(command[4]));
        redis.set(command[3], String(next));
        return Response.json({ result: next });
      }
      if (command[0] === 'SET') {
        if (command.includes('NX') && redis.has(command[1])) return Response.json({ result: null });
        redis.set(command[1], command[2]);
        return Response.json({ result: 'OK' });
      }
      return Response.json({ result: 1 });
    }

    if (String(url) === 'https://apinex.bond/api/public/models') {
      return Response.json({ models: [eligible('free/deepseek-v4.1-flash')] });
    }
    if (String(url).startsWith('https://api.apinex.bond/v1/subscription')) {
      assert.equal(init.headers.Authorization, 'Bearer apinex-server-test-key');
      return Response.json({ resets_at_utc: new Date(Date.now() + 60 * 60 * 1000).toISOString(), tokens_remaining: 0 });
    }
    if (String(url).startsWith('https://openrouter.test/v1/models')) {
      return Response.json({ data: [{ id: 'openai/gpt-oss-120b:free', name: 'Open free model', context_length: 128000 }] });
    }

    const body = init.body ? JSON.parse(init.body) : {};
    if (String(url).startsWith('https://api.apinex.bond/v1/chat/completions')) {
      providerCalls.push({ provider: 'apinex', url: String(url), body, authorization: init.headers.Authorization });
      apinexResponseCount += 1;
      if (quotaResponse) {
        return Response.json({ error: { message: 'sensitive APInex vendor detail must not be logged' } }, { status: 402 });
      }
      return Response.json({ error: { message: 'sensitive APInex vendor detail must not be logged' } }, { status: 429, headers: { 'retry-after': '300' } });
    }
    if (String(url).startsWith('https://openrouter.test/v1/chat/completions')) {
      providerCalls.push({ provider: 'openrouter', url: String(url), body });
      return new Response('data: {"choices":[{"delta":{"content":"served by existing fallback"}}]}\n\n', {
        status: 200,
        headers: { 'content-type': 'text/event-stream', 'x-routed-via': 'openrouter/model-free' },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const { route } = await import('../lib/spark.js?apinex-routing-test');
  const input = { mode: 'chat', task: 'general', hasImg: false, payload: [{ role: 'user', content: 'hello' }], budgetMs: 5000 };
  const [first, concurrent] = await Promise.all([route(input), route(input)]);
  assert.equal(first.ok, true);
  assert.equal(concurrent.ok, true);
  assert.match(await new Response(first.stream).text(), /served by existing fallback/);
  assert.match(await new Response(concurrent.stream).text(), /served by existing fallback/);
  assert.equal(providerCalls.filter((call) => call.provider === 'apinex').length, 1);
  assert.equal(providerCalls.filter((call) => call.provider === 'openrouter').length, 2);
  const apinexCall = providerCalls.find((call) => call.provider === 'apinex');
  assert.equal(apinexCall.body.model, 'free/deepseek-v4.1-flash');
  assert.equal(apinexCall.authorization, 'Bearer apinex-server-test-key');
  assert.equal(apinexCall.body.messages[0].content, 'hello');
  assert.ok(redisCommands.some((command) => command[0] === 'SET' && command[1] === APINEX_ACCOUNT_COOLDOWN_KEY && command[3] === 'PX' && command[4] === String(APINEX_MIN_REQUEST_INTERVAL_MS) && command[5] === 'NX'));
  assert.ok(Number(redis.get(APINEX_ACCOUNT_COOLDOWN_KEY)) > Date.now() + 4.5 * 60 * 1000);
  assert.ok(warnings.every((warning) => !warning.includes('sensitive APInex vendor detail')));
  assert.ok(!JSON.stringify(warnings).includes('apinex-server-test-key'));

  // Simulate a fresh request after the 429 hold, then return a depleted allowance with a published reset.
  redis.delete(APINEX_ACCOUNT_COOLDOWN_KEY);
  globalThis.__synthApinexCool?.clear();
  quotaResponse = true;
  const quotaRoute = await route(input);
  assert.equal(quotaRoute.ok, true);
  await new Response(quotaRoute.stream).text();
  assert.equal(apinexResponseCount, 2);
  assert.ok(Number(redis.get(APINEX_ACCOUNT_COOLDOWN_KEY)) > Date.now() + 50 * 60 * 1000);
  assert.ok(providerCalls.some((call) => call.provider === 'openrouter' && call.body.model === 'openai/gpt-oss-120b:free'));

  // A following request on another function instance is blocked by the shared quota cooldown.
  globalThis.__synthApinexCool?.clear();
  const before = apinexResponseCount;
  const cooledRoute = await route(input);
  assert.equal(cooledRoute.ok, true);
  await new Response(cooledRoute.stream).text();
  assert.equal(apinexResponseCount, before);

  // If atomic cooldown persistence fails, APInex is quarantined by a separate shared NX breaker.
  redis.delete(APINEX_ACCOUNT_COOLDOWN_KEY);
  globalThis.__synthApinexCool?.clear();
  evalDown = true;
  quotaResponse = false;
  const beforePersistenceFailure = apinexResponseCount;
  const persistenceFailureRoute = await route(input);
  assert.equal(persistenceFailureRoute.ok, true);
  await new Response(persistenceFailureRoute.stream).text();
  assert.equal(apinexResponseCount, beforePersistenceFailure + 1);
  assert.ok(redisCommands.some((command) => command[0] === 'SET' && command[1] === APINEX_CIRCUIT_BREAKER_KEY && command[3] === 'EX' && command[4] === '86400'));
  assert.ok(Number(redis.get(APINEX_CIRCUIT_BREAKER_KEY)) > Date.now() + 23 * 60 * 60 * 1000);
  globalThis.__synthApinexCool?.clear(); // Simulate a new serverless instance.
  const beforeCircuitCheck = apinexResponseCount;
  const circuitRoute = await route(input);
  assert.equal(circuitRoute.ok, true);
  await new Response(circuitRoute.stream).text();
  assert.equal(apinexResponseCount, beforeCircuitCheck);
  evalDown = false;

  // A transient Upstash failure also fails closed instead of bypassing the global rate limit.
  redis.delete(APINEX_ACCOUNT_COOLDOWN_KEY);
  redis.delete(APINEX_CIRCUIT_BREAKER_KEY);
  globalThis.__synthApinexCool?.clear();
  redisDown = true;
  const storageDownRoute = await route(input);
  assert.equal(storageDownRoute.ok, true);
  await new Response(storageDownRoute.stream).text();
  assert.equal(apinexResponseCount, beforeCircuitCheck);
  redisDown = false;

  // Images never leave SYNTH through APInex, even when it is the only configured service.
  process.env.PROVIDER_ORDER = 'apinex';
  process.env.AI_API_KEY = '';
  const imageRoute = await route({ ...input, hasImg: true, task: 'image-reading', payload: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'data:image/png;base64,AA==' } }] }] });
  assert.equal(imageRoute.ok, false);
  assert.equal(imageRoute.noTargets, true);
  assert.equal(apinexResponseCount, beforeCircuitCheck);

  const { completeWith } = await import('../lib/ai.js?apinex-learning-test');
  await assert.rejects(() => completeWith([{ role: 'user', content: 'Analyze learning data.' }]), /not used for training analysis/);
});
