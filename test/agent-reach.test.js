import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PublicSourceError, publicSourceTool, publicSourcesReady } from '../lib/public-sources-client.js';

const source = (overrides = {}) => ({
  title: 'A public result',
  url: 'https://github.com/example/project',
  author: 'maintainer',
  publishedAt: '2026-01-01',
  text: 'Public result text',
  snippet: 'A concise excerpt',
  ...overrides,
});
const reply = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('public source service binding accepts only plain HTTP(S) URL bases', () => {
  assert.equal(publicSourcesReady('https://agent-reach.internal/'), true);
  assert.equal(publicSourcesReady('http://127.0.0.1:8001'), true);
  assert.equal(publicSourcesReady('file:///tmp/worker'), false);
  assert.equal(publicSourcesReady('https://user:password@agent-reach.internal/'), false);
  assert.equal(publicSourcesReady('https://agent-reach.internal/?token=secret'), false);
});

test('the internal call sends the strict action payload and returns a compact safe source card', async () => {
  let captured;
  const result = await publicSourceTool('github', 'search', { query: 'synth agents', limit: 1 }, {
    serviceUrl: 'https://agent-reach.internal/',
    fetchImpl: async (url, init) => {
      captured = { url: String(url), init };
      return reply({ ok: true, items: [source()] });
    },
  });
  assert.equal(captured.url, 'https://agent-reach.internal/execute');
  assert.equal(captured.init.method, 'POST');
  assert.deepEqual(JSON.parse(captured.init.body), { channel: 'github', action: 'search', params: { query: 'synth agents', limit: 1 } });
  assert.equal(captured.init.headers.Authorization, undefined);
  assert.equal(result.summary, '1 public result');
  assert.equal(result.sources.length, 1);
  assert.deepEqual(result.sources[0], {
    url: 'https://github.com/example/project',
    title: 'A public result',
    host: 'github.com',
    snippet: 'A concise excerpt',
  });
  assert.match(result.text, /Public result text/);
});

test('source count is capped and unsafe hosts never reach the model or UI metadata', async () => {
  const items = [
    source({ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }),
    source({ url: 'https://youtube.com.evil.example/watch?v=jNQXAC9IVRw' }),
    source({ url: 'https://github.com/example/project' }),
    source({ url: 'https://youtu.be/abcdefghijk' }),
    source({ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw' }),
    source({ url: 'https://www.youtube.com/watch?v=after-limit' }),
  ];
  const result = await publicSourceTool('youtube', 'search', { query: 'public videos', limit: 5 }, {
    serviceUrl: 'https://agent-reach.internal',
    fetchImpl: async () => reply({ ok: true, items }),
  });
  assert.equal(result.sources.length, 3);
  assert.ok(result.sources.every((item) => item.host === 'youtube.com'));
  assert.ok(result.sources.every((item) => item.url.startsWith('https://www.youtube.com/watch?v=')));
  assert.doesNotMatch(result.text, /evil\.example|github\.com|redirect|after-limit/);
});

test('YouTube redirect and playlist pages are never cited as videos', async () => {
  const result = await publicSourceTool('youtube', 'search', { query: 'public videos', limit: 2 }, {
    serviceUrl: 'https://agent-reach.internal',
    fetchImpl: async () => reply({ ok: true, items: [
      source({ url: 'https://www.youtube.com/redirect?url=https://example.org' }),
      source({ url: 'https://www.youtube.com/playlist?list=PL123' }),
    ] }),
  });
  assert.deepEqual(result.sources, []);
  assert.equal(result.text, 'No public results were found.');
});

test('read and subtitle payload content remains within SYNTH tool-result bounds', async () => {
  const result = await publicSourceTool('youtube', 'subtitle', { target: 'jNQXAC9IVRw' }, {
    serviceUrl: 'https://agent-reach.internal',
    fetchImpl: async () => reply({ ok: true, items: [source({ url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw', text: 'caption '.repeat(2_000) })] }),
  });
  assert.ok(result.text.length <= 6000);
  assert.equal(result.sources.length, 1);
});

test('service errors are mapped to safe user-facing text without upstream diagnostics', async () => {
  await assert.rejects(
    publicSourceTool('github', 'search', { query: 'x' }, {
      serviceUrl: 'https://agent-reach.internal',
      fetchImpl: async () => reply({ ok: false, code: 'RATE_LIMITED', detail: 'raw internal traceback' }),
    }),
    (error) => error instanceof PublicSourceError && /rate-limited/i.test(error.message) && !/traceback/i.test(error.message),
  );
  await assert.rejects(
    publicSourceTool('github', 'search', { query: 'x' }, {
      serviceUrl: 'https://agent-reach.internal',
      fetchImpl: async () => reply({ ok: false, code: 'toString', detail: 'must not leak' }),
    }),
    (error) => error instanceof PublicSourceError && !/must not leak|function/i.test(error.message),
  );
});

test('missing or malformed service binding fails closed without making a request', async () => {
  let called = false;
  await assert.rejects(
    publicSourceTool('github', 'search', { query: 'x' }, {
      serviceUrl: 'https://user:password@agent-reach.internal/',
      fetchImpl: async () => { called = true; return reply({ ok: true, items: [] }); },
    }),
    (error) => error instanceof PublicSourceError,
  );
  assert.equal(called, false);
});

test('the Node adapter rejects unapproved actions before calling the private worker', async () => {
  let called = false;
  await assert.rejects(
    publicSourceTool('youtube', 'transcribe', { target: 'jNQXAC9IVRw' }, {
      serviceUrl: 'https://agent-reach.internal',
      fetchImpl: async () => { called = true; return reply({ ok: true, items: [] }); },
    }),
    (error) => error instanceof PublicSourceError,
  );
  assert.equal(called, false);
});

test('Vercel keeps Next.js public, the Python service private, and the learning cron intact', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(config.crons, [{ path: '/api/cron/learn', schedule: '0 3 * * *' }]);
  assert.equal(config.services.synth_frontend.root, '.');
  assert.equal(config.services.synth_frontend.framework, 'nextjs');
  assert.deepEqual(config.services.synth_frontend.bindings, [{ type: 'service', service: 'agent_reach', format: 'url', env: 'AGENT_REACH_URL' }]);
  assert.equal(config.services.agent_reach.root, 'services/agent_reach');
  assert.equal(config.services.agent_reach.framework, 'fastapi');
  assert.equal(config.services.agent_reach.entrypoint, 'app:app');
  assert.ok(config.rewrites.every((rule) => rule.destination.service === 'synth_frontend'));
});

test('SYNTHCODE shows response-scoped Sources for the current and earlier tool-backed builds', () => {
  const builder = readFileSync(new URL('../components/Builder.js', import.meta.url), 'utf8');
  assert.match(builder, /import SourcesDisclosure from '\.\/SourcePreview'/);
  assert.match(builder, /sourcesFromTools\(h\.tools\)/);
  assert.match(builder, /sourcesFromTools\(last\.status === 'building' \? tools : last\.tools\)/);
});

test('Agent-Reach and its wheel are pinned in the Python service lock', () => {
  const manifest = readFileSync(new URL('../services/agent_reach/pyproject.toml', import.meta.url), 'utf8');
  const lock = readFileSync(new URL('../services/agent_reach/uv.lock', import.meta.url), 'utf8');
  assert.match(manifest, /Agent-Reach\/releases\/download\/v1\.6\.1\/agent_reach-1\.6\.1-py3-none-any\.whl/);
  assert.match(lock, /name = "agent-reach"\nversion = "1\.6\.1"/);
  assert.match(lock, /hash = "sha256:[a-f0-9]{64}"/);
});
