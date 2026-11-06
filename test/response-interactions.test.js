import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

// Keep these tests independent of optional developer credentials and real Redis.
const envNames = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'NODE_ENV'];
const previousEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.NODE_ENV = 'test';
const { POST: logPost } = await import('../app/api/log/route.js');
const { POST: feedbackPost } = await import('../app/api/feedback/route.js');
const { POST: sharePost } = await import('../app/api/share/route.js');
const { addEvent, getTemp, putTemp, recent } = await import('../lib/db.js');

after(() => {
  for (const name of envNames) {
    if (previousEnv[name] === undefined) delete process.env[name];
    else process.env[name] = previousEnv[name];
  }
});

function resetStore() {
  const store = globalThis.__synthai;
  for (const key of Object.keys(store.kv)) delete store.kv[key];
  for (const key of Object.keys(store.list)) delete store.list[key];
  for (const key of Object.keys(store.hash)) delete store.hash[key];
  for (const key of Object.keys(store.expires)) delete store.expires[key];
}

beforeEach(resetStore);
const jsonRequest = (url, body, ip = '198.51.100.72') => new Request(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  body: JSON.stringify(body),
});


test('ratings update one existing event, sanitize feedback, and allow category/rating changes', async () => {
  const id = await addEvent({ mode: 'chat', prompt: 'question', reply: 'answer', model: 'auto' });
  const negative = await feedbackPost(jsonRequest('https://synth.test/api/feedback', {
    id, value: -1, category: 'inaccurate', comment: 'Please review emma@example.com and reference 2125550123.',
  }));
  const first = await negative.json();
  assert.equal(negative.status, 200);
  assert.equal(first.value, -1);
  assert.equal(first.feedback.category, 'inaccurate');
  assert.match(first.feedback.comment, /\[email\]/);
  assert.match(first.feedback.comment, /\[number\]/);
  assert.equal((await recent(20)).length, 1);

  const revised = await feedbackPost(jsonRequest('https://synth.test/api/feedback', {
    id, value: -1, category: 'incomplete', comment: 'Please add one more step.',
  }));
  assert.equal((await revised.json()).changed, false, 'a negative category edit changes the note but not the model vote');
  assert.equal((await recent(20)).length, 1, 'a changed note does not create a duplicate event');

  const changedVote = await feedbackPost(jsonRequest('https://synth.test/api/feedback', { id, value: 1 }));
  assert.equal((await changedVote.json()).value, 1);
  const [event] = await recent(20);
  assert.equal(event.fb, 1);
  assert.equal(event.feedback, undefined, 'switching away from a negative rating clears its note');
});


test('feedback rejects invalid categories and malformed rating requests', async () => {
  const id = await addEvent({ mode: 'chat', prompt: 'q', reply: 'a', model: 'auto' });
  const invalidCategory = await feedbackPost(jsonRequest('https://synth.test/api/feedback', { id, value: -1, category: 'secret' }));
  assert.equal(invalidCategory.status, 400);
  const invalidRating = await feedbackPost(jsonRequest('https://synth.test/api/feedback', { id, value: 7 }));
  assert.equal(invalidRating.status, 400);
  assert.equal((await recent(20))[0].fb, 0);
});


test('activity logging keeps conversation and regeneration linkage on the same established event schema', async () => {
  const sourceId = await addEvent({ mode: 'chat', prompt: 'old', reply: 'old answer', model: 'auto' });
  const result = await logPost(jsonRequest('https://synth.test/api/log', {
    mode: 'chat', prompt: 'Follow up from jane@example.com 2125550123', reply: 'A response to copy.', model: 'auto',
    conversationId: 'conv_abcdef123', regeneratedFrom: sourceId,
  }));
  assert.equal(result.status, 200);
  const { id } = await result.json();
  const event = (await recent(20)).find((entry) => entry.id === id);
  assert.ok(event);
  assert.equal(event.conversationId, 'conv_abcdef123');
  assert.equal(event.regeneratedFrom, sourceId);
  assert.doesNotMatch(event.prompt, /jane@example\.com|2125550123/);
  assert.equal((await recent(20)).length, 2);
});


test('response share requires consent and stores only the selected response under an expiring token', async () => {
  const denied = await sharePost(jsonRequest('https://synth.test/api/share', { response: 'Sensitive answer', consent: false }));
  assert.equal(denied.status, 400);

  const answer = 'Only this chosen response is shared.';
  const created = await sharePost(jsonRequest('https://synth.test/api/share', { response: answer, consent: true }));
  const data = await created.json();
  assert.equal(created.status, 200);
  assert.match(data.path, /^\/share\/[A-Za-z0-9_-]{32}$/);
  const token = data.path.split('/').at(-1);
  const stored = await getTemp('share:' + token);
  assert.equal(stored.response, answer);
  assert.ok(stored.expiresAt > Date.now());
  assert.ok(stored.expiresAt - stored.createdAt <= 24 * 60 * 60 * 1000);
  assert.equal((await recent(20)).length, 0, 'sharing is not recorded as a second conversation or response event');
});


test('share links fail safely without persistent storage on production deployments', async () => {
  const old = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const response = await sharePost(jsonRequest('https://synth.test/api/share', { response: 'Answer', consent: true }));
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /Upstash/);
  } finally {
    if (old === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = old;
  }
});


test('in-memory expiring share records are not readable after their TTL', async () => {
  await putTemp('share:expired-test', { response: 'expired', expiresAt: Date.now() - 1 }, -1);
  assert.equal(await getTemp('share:expired-test'), null);
});
