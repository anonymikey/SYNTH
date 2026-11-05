import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Keep these tests isolated from any optional Upstash credentials in the developer's shell.
const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
const { POST: imagePost } = await import('../app/api/image/route.js');
const { POST: transcribePost } = await import('../app/api/transcribe/route.js');
if (upstashUrl !== undefined) process.env.UPSTASH_REDIS_REST_URL = upstashUrl;
if (upstashToken !== undefined) process.env.UPSTASH_REDIS_REST_TOKEN = upstashToken;

const envNames = ['AI_API_KEY', 'ENABLE_CLOUDFLARE', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'PROVIDER_ORDER'];
const previous = Object.fromEntries(envNames.map((k) => [k, process.env[k]]));
const originalFetch = globalThis.fetch;
beforeEach(() => {
  process.env.AI_API_KEY = 'sk-openrouter-example-key-long-enough';
  process.env.ENABLE_CLOUDFLARE = 'true';
  process.env.CLOUDFLARE_ACCOUNT_ID = 'b'.repeat(32);
  process.env.CLOUDFLARE_API_TOKEN = 'cf-test-token';
  process.env.PROVIDER_ORDER = 'cloudflare,openrouter,spark';
  globalThis.fetch = originalFetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const k of envNames) {
    if (previous[k] === undefined) delete process.env[k];
    else process.env[k] = previous[k];
  }
});

test('image endpoint uses FLUX and returns a correctly typed generated PNG', async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]).toString('base64');
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /\/ai\/run\/@cf\/black-forest-labs\/flux-1-schnell$/);
    assert.equal(options.headers.Authorization, 'Bearer cf-test-token');
    assert.equal(JSON.parse(options.body).steps, 4);
    return Response.json({ success: true, result: { image: png } });
  };
  const response = await imagePost(new Request('https://synth.test/api/image', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.21' }, body: JSON.stringify({ prompt: 'A blue glass planet' }),
  }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.match(data.image, /^data:image\/png;base64,/);
  assert.equal(data.model, 'cloudflare/@cf/black-forest-labs/flux-1-schnell');
  assert.ok(data.tid);
});

test('transcription endpoint passes base64 audio to Whisper and returns text', async () => {
  globalThis.fetch = async (url, options) => {
    assert.match(String(url), /\/ai\/run\/@cf\/openai\/whisper-large-v3-turbo$/);
    const body = JSON.parse(options.body);
    assert.equal(body.audio, Buffer.from('sample voice').toString('base64'));
    assert.equal(body.task, 'transcribe');
    return Response.json({ success: true, result: { text: 'Hello from the microphone.' } });
  };
  const form = new FormData();
  form.append('audio', new Blob(['sample voice'], { type: 'audio/webm' }), 'voice.webm');
  const response = await transcribePost(new Request('https://synth.test/api/transcribe', {
    method: 'POST', headers: { 'x-forwarded-for': '198.51.100.22' }, body: form,
  }));
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.text, 'Hello from the microphone.');
  assert.equal(data.model, 'cloudflare/@cf/openai/whisper-large-v3-turbo');
  assert.ok(data.tid);
});

test('image generation stays disabled unless the Cloudflare flag is on', async () => {
  process.env.ENABLE_CLOUDFLARE = 'false';
  globalThis.fetch = async () => { throw new Error('Cloudflare must not be called'); };
  const response = await imagePost(new Request('https://synth.test/api/image', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'test' }),
  }));
  assert.equal(response.status, 503);
});
