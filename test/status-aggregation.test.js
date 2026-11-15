import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStatus } from '../lib/status.js';

const NOW = Date.UTC(2026, 10, 15, 17, 0, 0);
const ago = (minutes) => NOW - minutes * 60_000;

function service(snapshot, id) {
  return snapshot.services.find((item) => item.id === id);
}

test('aggregates only allowed routed outcomes into SYNTH feature groups', () => {
  const snapshot = aggregateStatus([
    { ts: ago(2), mode: 'chat', task: 'general', status: 'Success', ms: 850, provider: 'raw-provider', node: 'private-model', tid: 'private-id', fails: [{ msg: 'private error' }] },
    { ts: ago(3), mode: 'chat', task: 'analysis', status: 'Fallback', ms: 1500 },
    { ts: ago(4), mode: 'chat', task: 'writing', status: 'Failed', ms: 2500 },
    { ts: ago(7), mode: 'build', task: 'new-build', status: 'Success', ms: 1900 },
    { ts: ago(6), mode: 'chat', task: 'image-generation', status: 'Success', ms: 4300 },
    { ts: ago(5), mode: 'chat', task: 'speech-to-text', status: 'Failed', ms: 2800 },
  ], NOW);

  assert.equal(snapshot.overall.state, 'degraded');
  assert.equal(snapshot.overall.requests, 6);
  assert.equal(snapshot.overall.responded, 4);
  assert.equal(snapshot.overall.responseRatePct, 67);
  assert.equal(service(snapshot, 'assistant').state, 'degraded');
  assert.equal(service(snapshot, 'assistant').current.requests, 3);
  assert.equal(service(snapshot, 'assistant').current.responseRatePct, 67);
  assert.equal(service(snapshot, 'assistant').current.averageMs, 1175, 'failed routes have no first-response latency and must not skew this metric');
  assert.equal(service(snapshot, 'synthcode').state, 'operational');
  assert.equal(service(snapshot, 'image').current.averageMs, 4300);
  assert.equal(service(snapshot, 'voice').state, 'degraded');
  assert.equal(snapshot.services.length, 4);
  assert.ok(snapshot.services.every((item) => item.history.length === 90));
});

test('repeated all-failed routes are outage signals; a single failure is not overclaimed', () => {
  const single = aggregateStatus([{ ts: ago(1), mode: 'build', task: 'new-build', status: 'Failed', ms: 2000 }], NOW);
  assert.equal(service(single, 'synthcode').state, 'degraded');
  assert.equal(single.overall.state, 'degraded');

  const repeated = aggregateStatus([1, 2, 3].map((minute) => ({ ts: ago(minute), mode: 'build', task: 'new-build', status: 'Failed', ms: 2000 })), NOW);
  assert.equal(service(repeated, 'synthcode').state, 'outage');
  assert.equal(repeated.overall.state, 'outage');
});

test('failed chat/build routes still count as failed but have no first-response timing', () => {
  const snapshot = aggregateStatus([
    { ts: ago(1), mode: 'chat', task: 'general', status: 'Failed', ms: 48_000 },
    { ts: ago(1), mode: 'build', task: 'new-build', status: 'Failed', ms: 51_000 },
    { ts: ago(1), mode: 'chat', task: 'image-generation', status: 'Failed', ms: 2900 },
  ], NOW);
  assert.equal(service(snapshot, 'assistant').current.failed, 1);
  assert.equal(service(snapshot, 'assistant').current.averageMs, null);
  assert.equal(service(snapshot, 'synthcode').current.failed, 1);
  assert.equal(service(snapshot, 'synthcode').current.averageMs, null);
  assert.equal(service(snapshot, 'image').current.failed, 1);
  assert.equal(service(snapshot, 'image').current.averageMs, 2900, 'media duration includes real failed task processing time');
});

test('empty activity is unknown and history bars remain neutral, not successful uptime', () => {
  const snapshot = aggregateStatus([], NOW);
  assert.equal(snapshot.overall.state, 'unknown');
  assert.equal(snapshot.overall.responseRatePct, null);
  for (const item of snapshot.services) {
    assert.equal(item.state, 'unknown');
    assert.equal(item.current.averageMs, null);
    assert.ok(item.history.every((day) => day.state === 'unknown' && day.requests === 0));
  }
});

test('uses a 15-minute window and ignores stale, invalid, unknown and excessive future entries', () => {
  const snapshot = aggregateStatus([
    { ts: ago(14.99), mode: 'chat', task: 'general', status: 'Success', ms: 200 },
    { ts: ago(15.01), mode: 'chat', task: 'general', status: 'Failed', ms: 300 },
    { ts: NOW + 30_000, mode: 'chat', task: 'general', status: 'Success', ms: 100 },
    { ts: NOW + 120_000, mode: 'chat', task: 'general', status: 'Failed', ms: 100 },
    { ts: NOW, mode: 'other', task: 'unknown', status: 'Success', ms: 100 },
    { ts: NOW, mode: 'chat', task: 'general', status: 'other', ms: 100 },
    { ts: 'not-a-time', mode: 'chat', task: 'general', status: 'Success', ms: 100 },
  ], NOW);
  assert.equal(service(snapshot, 'assistant').current.requests, 2);
  assert.equal(service(snapshot, 'assistant').current.responded, 2);
  assert.equal(service(snapshot, 'assistant').state, 'operational');
});

test('daily history includes outcomes only on observed UTC dates within the retained 90 days', () => {
  const oldWithinRange = NOW - 89 * 24 * 60 * 60 * 1000;
  const tooOld = NOW - 91 * 24 * 60 * 60 * 1000;
  const snapshot = aggregateStatus([
    { ts: NOW, mode: 'build', task: 'new-build', status: 'Fallback', ms: 1000 },
    { ts: oldWithinRange, mode: 'build', task: 'new-build', status: 'Success', ms: 1000 },
    { ts: tooOld, mode: 'build', task: 'new-build', status: 'Failed', ms: 1000 },
  ], NOW);
  const history = service(snapshot, 'synthcode').history;
  assert.equal(history[0].date, new Date(oldWithinRange).toISOString().slice(0, 10));
  assert.equal(history[0].direct, 1);
  assert.equal(history.at(-1).recovered, 1);
  assert.equal(history.reduce((sum, day) => sum + day.requests, 0), 2);
});

test('caps input inspection at 500 and clearly marks possible retention truncation', () => {
  const entries = Array.from({ length: 501 }, (_, index) => ({ ts: ago(index % 15), mode: 'chat', task: 'general', status: 'Success', ms: 100 }));
  const snapshot = aggregateStatus(entries, NOW);
  assert.equal(snapshot.coverage.recordsAnalyzed, 500);
  assert.equal(snapshot.coverage.limit, 500);
  assert.equal(snapshot.coverage.mayBeTruncated, true);
  assert.equal(service(snapshot, 'assistant').current.requests, 500);
});

test('public serialization cannot expose provider identifiers, failures, event IDs, or user content', () => {
  const snapshot = aggregateStatus([{
    ts: ago(1), mode: 'chat', task: 'general', status: 'Fallback', ms: 900,
    provider: 'SECRET_PROVIDER', node: 'SECRET_MODEL', tid: 'PRIVATE_EVENT_ID',
    fails: [{ target: 'SECRET_TARGET', msg: 'PRIVATE_UPSTREAM_DIAGNOSTIC' }],
    prompt: 'PRIVATE_PROMPT', reply: 'PRIVATE_RESPONSE', token: 'SECRET_TOKEN',
  }], NOW);
  const serialized = JSON.stringify(snapshot);
  for (const secret of ['SECRET_PROVIDER', 'SECRET_MODEL', 'PRIVATE_EVENT_ID', 'SECRET_TARGET', 'PRIVATE_UPSTREAM_DIAGNOSTIC', 'PRIVATE_PROMPT', 'PRIVATE_RESPONSE', 'SECRET_TOKEN']) {
    assert.equal(serialized.includes(secret), false, `public snapshot must omit ${secret}`);
  }
  assert.deepEqual(Object.keys(snapshot), ['generatedAt', 'windowMinutes', 'historyDays', 'coverage', 'overall', 'services']);
  for (const row of snapshot.services) assert.deepEqual(Object.keys(row), ['id', 'label', 'metricLabel', 'state', 'current', 'history']);
});
