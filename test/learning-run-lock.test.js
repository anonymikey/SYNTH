import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const envKeys = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CRON_SECRET', 'AGENT_FEEDS', 'AI_API_KEY', 'AI_BASE_URL', 'PROVIDER_ORDER', 'ENABLE_SPARK', 'ENABLE_CLOUDFLARE', 'ENABLE_UNOROUTER', 'ENABLE_APINEX', 'GATEWAY_MODE', 'DEFAULT_MODEL'];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
process.env.UPSTASH_REDIS_REST_URL = 'https://redis-learning-test.invalid';
process.env.UPSTASH_REDIS_REST_TOKEN = 'learning-test-token-not-secret';
const { runLearning } = await import('../lib/learn.js?shared-lock-contract');
const db = await import('../lib/db.js');

const values = new Map();
const lessonHash = new Map();
let requests = [];
let eventIds = [];
let analysisRequests = [];

function redisReply(result) {
  return new Response(JSON.stringify({ result }), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  values.clear();
  lessonHash.clear();
  requests = [];
  eventIds = [];
  analysisRequests = [];
  for (const key of ['AI_API_KEY', 'AI_BASE_URL', 'PROVIDER_ORDER', 'ENABLE_SPARK', 'ENABLE_CLOUDFLARE', 'ENABLE_UNOROUTER', 'ENABLE_APINEX', 'GATEWAY_MODE', 'DEFAULT_MODEL']) delete process.env[key];
  globalThis.fetch = async (url, init = {}) => {
    const target = String(url);
    if (target === 'https://redis-learning-test.invalid') {
      const command = JSON.parse(init.body);
      requests.push(command);
      if (command[0] === 'SET') {
        const [, key, value, ...options] = command;
        if (options.includes('NX') && values.has(key)) return redisReply(null);
        values.set(key, value);
        return redisReply('OK');
      }
      if (command[0] === 'MGET') return redisReply(command.slice(1).map((key) => values.get(key) ?? null));
      if (command[0] === 'EVAL') {
        const [, script, , key, owner] = command;
        if (script.includes("redis.call('DEL',KEYS[1])")) {
          if (values.get(key) === owner) { values.delete(key); return redisReply(1); }
          return redisReply(0);
        }
        return redisReply(0);
      }
      if (command[0] === 'LRANGE') return redisReply(command[1] === 'events' ? eventIds.slice(+command[2], +command[3] + 1) : []);
      if (command[0] === 'HGETALL') return redisReply(Object.fromEntries(lessonHash));
      if (command[0] === 'HSET') { lessonHash.set(command[2], command[3]); return redisReply(1); }
      if (command[0] === 'HDEL') { lessonHash.delete(command[2]); return redisReply(1); }
      if (command[0] === 'LPUSH') { eventIds.unshift(command[2]); return redisReply(1); }
      if (command[0] === 'LTRIM') { eventIds = eventIds.slice(+command[2], +command[3] + 1); return redisReply('OK'); }
      throw new Error(`Unexpected Redis command: ${command[0]}`);
    }
    if (target === 'https://openrouter.ai/api/v1/models') {
      return Response.json({ data: [{ id: 'openai/gpt-oss-20b:free', context_length: 32768, architecture: { output_modalities: ['text'] } }] });
    }
    if (target === 'https://openrouter.ai/api/v1/chat/completions') {
      const request = JSON.parse(init.body);
      analysisRequests.push(request);
      const result = { lessons: [{ topic: 'Clear explanations', text: 'State important constraints and verify assumptions before answering.' }], weak_areas: [{ topic: 'Clarity', why: 'Several recent interactions needed clearer next steps.', severity: 2 }] };
      return Response.json({ choices: [{ message: { content: JSON.stringify(result) } }] });
    }
    throw new Error(`Unexpected external request: ${target}`);
  };
});

afterEach(() => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

test('shared learning lock allows only one concurrent run and insufficient data is reported honestly', async () => {
  assert.equal(db.persistent, true);
  const results = await Promise.all([runLearning(), runLearning()]);
  assert.equal(results.filter((result) => result.busy).length, 1);
  assert.equal(results.filter((result) => result.status === 'insufficient_data').length, 1);
  assert.equal(results.find((result) => result.status === 'insufficient_data').analyzed, 0);
  assert.equal(values.has('learn:run:lock'), false, 'the owner must release its lock');
  assert.equal(requests.some((command) => command[0] === 'HSET' || command[0] === 'LRANGE'), true);
  assert.equal(requests.some((command) => command[0] === 'POST' || command.includes('chat/completions')), false, 'no AI provider request should run with insufficient evidence');
});

test('mocked learning run collects evidence, validates model output, persists lessons and focus, and records success', async () => {
  process.env.AI_API_KEY = 'learning-test-key-with-sufficient-length';
  process.env.PROVIDER_ORDER = 'openrouter';
  const events = [
    { id: 'one', ts: Date.now() - 3000, mode: 'chat', prompt: 'Explain this result', reply: 'Here is the result.', fb: 1 },
    { id: 'two', ts: Date.now() - 2000, mode: 'build', prompt: 'Make the layout responsive', reply: 'I updated the layout.', fb: 0 },
    { id: 'three', ts: Date.now() - 1000, mode: 'chat', prompt: 'Clarify the next step', reply: 'Try this next.', fb: -1 },
  ];
  for (const event of events) {
    eventIds.push(event.id);
    values.set(`ev:${event.id}`, JSON.stringify(event));
  }

  const result = await runLearning();
  assert.equal(result.status, 'succeeded');
  assert.equal(result.analyzed, 3);
  assert.equal(result.added, 1);
  assert.equal(result.pulled, 0);
  assert.deepEqual(result.attempts, []);
  assert.equal(analysisRequests.length, 1);
  assert.equal(analysisRequests[0].model, 'openai/gpt-oss-20b:free');
  assert.equal(JSON.parse(analysisRequests[0].messages[1].content).length, 3);
  assert.equal(lessonHash.size, 1, 'one validated lesson should be persisted for review');
  assert.equal(JSON.parse(values.get('meta:focus')).areas[0].topic, 'Clarity');
  assert.equal(JSON.parse(values.get('meta:lastResult')).status, 'succeeded');
  assert.equal(values.has('learn:run:lock'), false, 'the run lock is released after persistence');
});

test('concurrent lesson insertion claims shared deduplication key before writing one record', async () => {
  const lesson = { topic: 'Clarity', text: 'State uncertainty clearly and provide a concise next step.', source: 'self' };
  const results = await Promise.all([db.addLesson(lesson), db.addLesson(lesson)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(lessonHash.size, 1);
  assert.equal(requests.filter((command) => command[0] === 'HSET').length, 1);
  const claim = requests.find((command) => command[0] === 'SET' && String(command[1]).startsWith('lesson:dedup:'));
  assert.ok(claim, 'deduplication uses a Redis SET NX claim');
  assert.equal(claim.at(-1), 'NX');
});
