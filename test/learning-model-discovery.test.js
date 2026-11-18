import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rankedModels, pickModels } from '../lib/models.js';

const envKeys = ['AI_API_KEY', 'AI_BASE_URL', 'DEFAULT_MODEL'];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
const originalFetch = globalThis.fetch;

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
}
function catalogue() {
  return { data: [
    { id: 'verified/one:free', name: 'Verified Free One', context_length: 32000, architecture: { input_modalities: ['text'], output_modalities: ['text'] } },
    { id: 'paid/should-not-route', name: 'Paid Model', context_length: 128000, architecture: { input_modalities: ['text'], output_modalities: ['text'] } },
  ] };
}

beforeEach(() => {
  process.env.AI_API_KEY = 'test-openrouter-key-not-secret';
  process.env.AI_BASE_URL = 'https://openrouter.ai/api/v1';
  process.env.DEFAULT_MODEL = 'missing/configured-model:free';
  Object.assign(globalThis.__synthModels, { t: 0, list: [], base: '' });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
  Object.assign(globalThis.__synthModels, { t: 0, list: [], base: '' });
});

test('configured default never becomes a target unless the live catalog confirms it, and OpenRouter stays free-only', async () => {
  globalThis.fetch = async () => json(catalogue());
  const ranked = await rankedModels({ allowStale: false });
  assert.deepEqual(ranked.map((model) => model.id), ['verified/one:free']);
  assert.deepEqual((await pickModels(false, 'text', { allowStale: false })).map((model) => model.id), ['verified/one:free']);
});

test('Learning Studio refuses stale model eligibility and preserves upstream retry hints', async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    if (requests === 1) return json(catalogue());
    return json({ error: 'rate limit' }, 429, { 'retry-after': '90' });
  };
  assert.equal((await rankedModels({ allowStale: false })).length, 1);
  assert.equal((await rankedModels()).length, 1, 'non-learning consumers may use the bounded fresh cache');
  await assert.rejects(rankedModels({ allowStale: false, refresh: true }), (error) => {
    assert.equal(error.status, 429);
    assert.equal(error.retryAfterMs, 90000);
    return true;
  });
});
