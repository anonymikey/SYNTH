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

function clearLearningCooldowns() {
  const store = globalThis.__synthai;
  for (const key of Object.keys(store?.kv || {})) {
    if (key.startsWith('learn:cooldown:')) {
      delete store.kv[key];
      delete store.expires[key];
    }
  }
}

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function success(content, via = '') {
  return response({ choices: [{ message: { content } }] }, 200, via ? { 'x-routed-via': via } : {});
}
function rateLimited(model, retryAfter = '') {
  return response({ error: { code: 429, message: 'Provider returned error', metadata: { raw: `${model} temporarily rate-limited upstream. Please try shortly.` } } }, 429, retryAfter ? { 'retry-after': retryAfter } : {});
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
  clearLearningCooldowns();
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
  clearLearningCooldowns();
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

test('honors an HTTP-date Retry-After after the default cooldown would have expired', async () => {
  const realNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  const called = [];
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => {
    called.push(body.model);
    if (body.model === PRIMARY) return rateLimited(body.model, new Date(now + 600000).toUTCString());
    return success(validAnalysis());
  });

  try {
    const first = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
    assert.equal(first.attempts.length, 1);
    const beforeSecond = called.length;
    now += 180000;
    const second = await completeWith([{ role: 'user', content: 'analyze activity again' }], { validate: parseLearningOutput });
    assert.equal(second.attempts.length, 0);
    assert.ok(called.slice(beforeSecond).length > 0);
    assert.equal(called.slice(beforeSecond).includes(PRIMARY), false);
  } finally {
    Date.now = realNow;
  }
});

test('caps excessive Retry-After values at the documented maximum cooldown', async () => {
  const realNow = Date.now;
  const now = 3_000_000;
  Date.now = () => now;
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => {
    if (body.model === PRIMARY) return rateLimited(body.model, '999999');
    return success(validAnalysis());
  });
  try {
    await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
    const storageKey = `learn:cooldown:model:${encodeURIComponent(PRIMARY)}`;
    assert.equal(Number(JSON.parse(globalThis.__synthai.kv[storageKey])), now + 24 * 60 * 60 * 1000);
  } finally {
    Date.now = realNow;
  }
});

test('skips OpenRouter when every candidate model is still cooling down', async () => {
  const called = [];
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => {
    called.push(body.model);
    return success(validAnalysis());
  });
  for (const model of MODELS) globalThis.__synthCool.set(model.id, Date.now() + 120000);

  await assert.rejects(
    completeWith([{ role: 'user', content: 'analyze activity' }]),
    (error) => {
      assert.equal(called.length, 0);
      assert.equal(error.attempts.length, 1);
      assert.match(error.attempts[0].error, /No eligible model/);
      return true;
    },
  );
});

test('restores a model cooldown from shared storage after process-local cooldown state is lost', async () => {
  const realNow = Date.now;
  let now = 1_000_000;
  Date.now = () => now;
  const called = [];
  const storageKey = `learn:cooldown:model:${encodeURIComponent(PRIMARY)}`;
  globalThis.fetch = modelCatalogueAnd(async (_url, body) => {
    called.push(body.model);
    if (body.model === PRIMARY) return rateLimited(body.model, '600');
    return success(validAnalysis());
  });

  try {
    const first = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
    assert.equal(first.attempts.length, 1);
    assert.equal(Number(JSON.parse(globalThis.__synthai.kv[storageKey])), now + 600000);
    globalThis.__synthCool.clear();
    now += 180000;
    const beforeSecond = called.length;
    const second = await completeWith([{ role: 'user', content: 'analyze activity again' }], { validate: parseLearningOutput });
    assert.equal(second.attempts.length, 0);
    assert.equal(called.slice(beforeSecond).includes(PRIMARY), false);
  } finally {
    Date.now = realNow;
  }
});

test('restores a provider cooldown from shared storage after process-local cooldown state is lost', async () => {
  const realNow = Date.now;
  let now = 2_000_000;
  Date.now = () => now;
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'cloudflare,openrouter';
  const called = [];
  const storageKey = 'learn:cooldown:provider:cloudflare';
  globalThis.fetch = modelCatalogueAnd(async (url, body) => {
    if (url.startsWith('https://api.cloudflare.com/')) {
      called.push('cloudflare');
      return rateLimited('cloudflare', '600');
    }
    called.push(`openrouter:${body.model}`);
    return success(validAnalysis());
  });

  try {
    const first = await completeWith([{ role: 'user', content: 'analyze activity' }], { validate: parseLearningOutput });
    assert.equal(first.attempts.length, 1);
    assert.equal(Number(JSON.parse(globalThis.__synthai.kv[storageKey])), now + 600000);
    globalThis.__synthLearningProviderCool.clear();
    now += 180000;
    const beforeSecond = called.length;
    const second = await completeWith([{ role: 'user', content: 'analyze activity again' }], { validate: parseLearningOutput });
    assert.equal(second.attempts.length, 1);
    assert.equal(second.attempts[0].provider, 'cloudflare');
    assert.match(second.attempts[0].error, /cooldown/);
    assert.equal(called.slice(beforeSecond).includes('cloudflare'), false);
  } finally {
    Date.now = realNow;
  }
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

test('incomplete analysis JSON is rejected and the next provider gets a chance to train', async () => {
  enableCloudflare();
  process.env.PROVIDER_ORDER = 'openrouter,cloudflare';
  let openrouterCalls = 0;
  let cloudflareCalls = 0;
  globalThis.fetch = modelCatalogueAnd(async (url) => {
    if (url.startsWith('https://openrouter.ai/')) {
      openrouterCalls++;
      return success('{"lessons":[]}');
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

test('learning parser requires both result arrays and valid entries', () => {
  assert.throws(() => parseLearningOutput('{}'), /lessons list/);
  assert.throws(() => parseLearningOutput('{"lessons":[],"weak_areas":null}'), /weak-areas list/);
  assert.throws(() => parseLearningOutput('{"lessons":[{}],"weak_areas":[]}'), /lesson entry/);
  assert.throws(() => parseLearningOutput('{"lessons":[],"weak_areas":[{"topic":"Reliability"}]}'), /weak-area entry/);
  assert.deepEqual(parseLearningOutput('{"lessons":[],"weak_areas":[]}'), { lessons: [], weak_areas: [] });
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
