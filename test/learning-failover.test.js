import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { completeWith } from '../lib/ai.js';
import { parseLearningOutput } from '../lib/learn.js';
import { isCoolingDown } from '../lib/models.js';

const PRIMARY = 'google/gemma-4-26b-a4b:free';
const MODELS = [
  PRIMARY,
  'meta/llama-3.3-70b-instruct:free',
  'qwen/qwen3-8b:free',
  'openai/gpt-oss-20b:free',
].map((id) => ({ id, name: id, context_length: 32000 }));
const ENV_KEYS = [
  'AI_API_KEY', 'AI_BASE_URL', 'DEFAULT_MODEL', 'PROVIDER_ORDER', 'GATEWAY_MODE',
  'ENABLE_SPARK', 'SPARK_BASE_URL', 'SPARK_API_KEY', 'ENABLE_CLOUDFLARE',
  'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
];
const previousEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function success(content, via = '') {
  return response({ choices: [{ message: { content } }] }, 200, via ? { 'x-routed-via': via } : {});
}
function rateLimited(model) {
  return response({ error: { code: 429, message: 'Provider returned error', metadata: { raw: `${model} temporarily rate-limited upstream. Please try shortly.` } } }, 429);
}
function validAnalysis() {
  return JSON.stringify({ lessons: [{ topic: 'Clarity', text: 'State uncertainty clearly and provide a concise next step.' }], weak_areas: [{ topic: 'Reliability', why: 'Several requests failed.', severity: 2 }] });
}
function enableCloudflare() {
  process.env.ENABLE_CLOUDFLARE = 'true';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'a'.repeat(32);
  process.env.CLOUDFLARE_API_TOKEN = 'cf-test-token-long-enough';
}
function enableSpark() {
  process.env.ENABLE_SPARK = 'true';
  process.env.SPARK_BASE_URL = 'https://spark.example/v1';
  process.env.SPARK_API_KEY = 'freellmapi-test-key';
}

beforeEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
  process.env.AI_API_KEY = 'sk-openrouter-test-key-long-enough';
  process.env.AI_BASE_URL = 'https://openrouter.ai/api/v1';
  process.env.DEFAULT_MODEL = PRIMARY;
  process.env.PROVIDER_ORDER = 'openrouter';
  globalThis.__synthModels.list = [];
  globalThis.__synthModels.t = 0;
  globalThis.__synthCool.clear();
  globalThis.__synthLearningProviderCool.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of ENV_KEYS) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
  globalThis.__synthModels.list = [];
  globalThis.__synthModels.t = 0;
  globalThis.__synthCool.clear();
  globalThis.__synthLearningProviderCool.clear();
});

function modelCatalogueAnd(handler) {
  return async (input, init = {}) => {
    const url = String(input);
    if (url.endsWith('/models')) return response({ data: MODELS });
    const body = JSON.parse(init.body || '{}');
    return handler(url, body, init);
  };
}

test('an OpenRouter 429 cools the failed model, retries a healthy model, and avoids it next run', async () => {
  const called = [];
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => {
    called.push(body.model);
    if (body.model === PRIMARY) return rateLimited(body.model);
    return success(validAnalysis(), `openrouter/${body.model}`);
  });

  const first = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
  assert.equal(first.value.lessons.length, 1);
  assert.equal(first.attempts.length, 1);
  assert.equal(first.attempts[0].status, 429);
  assert.match(first.attempts[0].error, /rate-limited/);
  assert.equal(isCoolingDown(PRIMARY), true);
  assert.notEqual(first.model, `openrouter/${PRIMARY}`);

  const beforeSecondRun = called.length;
  const second = await completeWith([{ role: 'user', content: 'analyze activity again' }], { validate: parseLearningOutput });
  assert.equal(second.attempts.length, 0);
  assert.equal(called[beforeSecondRun], 'meta/llama-3.3-70b-instruct:free');
  assert.equal(called.includes(PRIMARY), true);
  assert.equal(called.slice(beforeSecondRun).includes(PRIMARY), false);
});

test('learning falls through all failed OpenRouter models to configured Cloudflare', async () => {
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'openrouter,cloudflare';
  const called = [];
  globalThis.fetch = modelCatalogueAnd(async (url, body) => {
    if (url.startsWith('https://openrouter.ai/')) {
      called.push(`openrouter:${body.model}`);
      return rateLimited(body.model);
    }
    called.push('cloudflare');
    return success(validAnalysis(), '@cf/zai-org/glm-4.7-flash');
  });

  const result = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
  assert.equal(result.model, '@cf/zai-org/glm-4.7-flash');
  assert.equal(result.value.weak_areas[0].topic, 'Reliability');
  assert.equal(result.attempts.length, 3);
  assert.ok(called.at(-1) === 'cloudflare');
  assert.equal(called.filter((call) => call.startsWith('openrouter:')).length, 3);
});

test('malformed JSON is rejected and the next provider gets a chance to produce valid learning output', async () => {
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'openrouter,cloudflare';
  let openrouterCalls = 0;
  let cloudflareCalls = 0;
  globalThis.fetch = modelCatalogueAnd(async (url) => {
    if (url.startsWith('https://openrouter.ai/')) {
      openrouterCalls++;
      return success('{"lessons":"not an array"}');
    }
    cloudflareCalls++;
    return success(validAnalysis());
  });

  const result = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
  assert.equal(openrouterCalls, 3);
  assert.equal(cloudflareCalls, 1);
  assert.equal(result.attempts.length, 3);
  assert.equal(result.value.lessons[0].topic, 'Clarity');
});

test('slow OpenRouter attempts cannot consume the reserved window for SPARK and Cloudflare', async () => {
  enableSpark();
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'openrouter,spark,cloudflare';
  const realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  const calls = [];
  globalThis.fetch = modelCatalogueAnd(async (url, body) => {
    if (url.startsWith('https://openrouter.ai/')) {
      calls.push('openrouter');
      now += 12000;
      return rateLimited(body.model);
    }
    if (url.startsWith('https://spark.example/')) {
      calls.push('spark');
      now += 14000;
      return rateLimited('spark/auto:smart');
    }
    calls.push('cloudflare');
    return success(validAnalysis());
  });

  try {
    const result = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
    assert.deepEqual(calls, ['openrouter', 'spark', 'cloudflare']);
    assert.equal(result.model, 'cloudflare/@cf/zai-org/glm-4.7-flash');
    assert.equal(result.attempts.length, 2);
  } finally {
    Date.now = realNow;
  }
});

test('all-provider failure returns bounded per-target diagnostics instead of only the last raw error', async () => {
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => rateLimited(body.model));
  await assert.rejects(
    completeWith([{ role: 'user', content: 'analyze activity' }]),
    (error) => {
      assert.equal(error.attempts.length, 3);
      assert.match(error.message, /No configured learning provider completed/);
      assert.match(error.message, /HTTP 429/);
      assert.ok(error.message.length <= 1000);
      return true;
    },
  );
});
