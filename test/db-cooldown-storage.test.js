import test from 'node:test';
import assert from 'node:assert/strict';

const originalFetch = globalThis.fetch;
const originalUrl = process.env.UPSTASH_REDIS_REST_URL;
const originalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.UPSTASH_REDIS_REST_URL = 'https://redis-unit-test.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token-not-a-secret';
const db = await import(new URL('../lib/db.js?cooldown-storage-contract', import.meta.url).href);

test('cooldown storage uses atomic Upstash EVAL and batched MGET REST commands', async () => {
  assert.equal(db.persistent, true);
  const requests = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://redis-unit-test.invalid');
    assert.equal(init.headers.Authorization, 'Bearer test-token-not-a-secret');
    const command = JSON.parse(init.body);
    requests.push(command);
    const result = command[0] === 'EVAL' ? 1700000000000 : ['1700000000000', null];
    return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    await db.putMaxTemp('learn:cooldown:model:example', 1700000000000, 600);
    const values = await db.getTemps(['learn:cooldown:model:example', 'learn:cooldown:provider:cloudflare']);
    assert.deepEqual(values, [1700000000000, null]);
    assert.equal(requests[0][0], 'EVAL');
    assert.equal(requests[0][2], '1');
    assert.equal(requests[0][3], 'learn:cooldown:model:example');
    assert.equal(requests[0][4], '1700000000000');
    assert.equal(requests[0][5], '600');
    assert.match(requests[0][1], /redis\.call\('GET',KEYS\[1\]\)/);
    assert.match(requests[0][1], /redis\.call\('SET',KEYS\[1\].*'EX',ARGV\[2\]\)/);
    assert.deepEqual(requests[1], ['MGET', 'learn:cooldown:model:example', 'learn:cooldown:provider:cloudflare']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
    else process.env.UPSTASH_REDIS_REST_URL = originalUrl;
    if (originalToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
    else process.env.UPSTASH_REDIS_REST_TOKEN = originalToken;
  }
});

test('cooldown storage commands abort when the shared REST service stalls', async () => {
  const keepAlive = setTimeout(() => {}, 100);
  globalThis.fetch = async (_url, init) => new Promise((resolve, reject) => {
    if (!init.signal) return reject(new Error('Expected an abort signal.'));
    init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
  });
  try {
    await assert.rejects(db.getTemps(['learn:cooldown:provider:cloudflare'], { timeoutMs: 20 }), { name: 'TimeoutError' });
    await assert.rejects(db.putMaxTemp('learn:cooldown:provider:cloudflare', 1700000000000, 60, { timeoutMs: 20 }), { name: 'TimeoutError' });
  } finally {
    clearTimeout(keepAlive);
    globalThis.fetch = originalFetch;
  }
});
