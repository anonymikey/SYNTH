// SYNTHSPARK: routing engine. Targets are tried in order until one starts answering:
//   1. Your FreeLLMAPI gateway (stacked free tiers: Google, Mistral, Cerebras, NVIDIA, OpenRouter, Cloudflare...), up to 2 routes
//   2. OpenRouter free models directly (also the only engine when no gateway is configured)
// A target that errors, rejects the key, breaks the stream or shows no token within 14 s is skipped silently.
import { apiBase, apiKey, keyProblem } from './env';
import { pickModels, cooldown } from './models';
import { pushCapped } from './db';
import { record, recordFail } from './core';

const MAX_ATTEMPTS = 4;       // first try + 3 automatic retries
const SPARK_TRIES = 2;        // gateway routes tried before falling back to OpenRouter
const FIRST_TOKEN_MS = 14000;
const BUDGET_MS = 36000;      // no new attempts after this, to stay inside the function time limit

const sparkCool = (globalThis.__sparkCool ||= new Map());
const env = (k) => (process.env[k] || '').trim();

// SPARK_BASE_URL may be given with or without the trailing /v1.
export const sparkBase = () => { const b = env('SPARK_BASE_URL').replace(/\/+$/, ''); return !b ? '' : /\/v1$/.test(b) ? b : b + '/v1'; };
export const sparkKey = () => env('SPARK_API_KEY').replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();
export const sparkEnabled = () => !!(sparkBase() && sparkKey());

// Gateway model strings. "auto", "auto:smart", "auto:reliable" and "auto:<profile>" are FreeLLMAPI routing modes.
// The gateway itself restricts image requests to vision-capable models.
const sparkModels = (code) => [...new Set((code ? [env('SPARK_CODE_MODEL'), 'auto:smart', 'auto:reliable'] : [env('SPARK_VISION_MODEL'), 'auto', 'auto:reliable']).filter(Boolean))].slice(0, SPARK_TRIES);

async function plan(code, hasImg) {
  const out = [];
  const now = Date.now();
  let cold = [];
  if (sparkEnabled()) {
    const all = sparkModels(code).map((model) => ({ engine: 'spark', base: sparkBase(), key: sparkKey(), model, label: 'spark/' + model }));
    out.push(...all.filter((t) => !(sparkCool.get(t.label) > now)));
    cold = all.filter((t) => sparkCool.get(t.label) > now); // recently failing: last resort only
  }
  if (!keyProblem()) {
    for (const m of await pickModels(hasImg, code ? 'code' : 'chat')) out.push({ engine: 'openrouter', base: apiBase(), key: apiKey(), model: m.id, label: 'openrouter/' + m.id });
  }
  return [...out, ...cold];
}

function brief(t) {
  try { return JSON.parse(t).error?.message || String(t).slice(0, 160); } catch { return String(t).slice(0, 160); }
}

// Reads the start of the stream until the model is really answering. Fails on errors or empty streams.
async function probe(reader) {
  const dec = new TextDecoder();
  const chunks = [];
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const l of lines) {
        const s = l.trim();
        if (!s.startsWith('data:')) continue;
        const d = s.slice(5).trim();
        if (!d || d === '[DONE]') continue;
        let j;
        try { j = JSON.parse(d); } catch { continue; }
        if (j.error) return { fail: brief(JSON.stringify(j)) };
        const c = j.choices?.[0];
        const dl = c?.delta || {};
        if (dl.content || dl.reasoning || dl.reasoning_content) return { live: { reader, chunks } };
        if (c?.finish_reason === 'error') return { fail: 'provider error' };
      }
    }
  } catch (e) { return { fail: e.name === 'AbortError' ? 'timed out' : e.message }; }
  return { fail: 'empty response' };
}

// Replays what was read while probing, then streams the rest.
function relay({ reader, chunks }) {
  return new ReadableStream({
    start(c) { chunks.forEach((b) => c.enqueue(b)); },
    async pull(c) {
      try { const { done, value } = await reader.read(); if (done) c.close(); else c.enqueue(value); } catch { c.close(); }
    },
    cancel() { reader.cancel().catch(() => {}); },
  });
}

async function attempt(t, messages, code) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FIRST_TOKEN_MS);
  const headers = { Authorization: `Bearer ${t.key}`, 'Content-Type': 'application/json', 'X-Title': 'SYNTH' };
  if (t.engine === 'spark') headers['X-FreeLLM-Task-Type'] = code ? 'code' : 'chat'; // soft routing hint for the gateway
  try {
    const up = await fetch(`${t.base}/chat/completions`, { method: 'POST', signal: ac.signal, headers, body: JSON.stringify({ model: t.model, stream: true, messages }) });
    if (!up.ok || !up.body) {
      const e = new Error(brief(await up.text().catch(() => '')) || up.statusText);
      e.status = up.status;
      throw e;
    }
    const reader = up.body.getReader();
    const r = await probe(reader);
    if (r.fail) { reader.cancel().catch(() => {}); const e = new Error(r.fail); e.status = r.fail === 'timed out' ? 504 : 502; throw e; }
    clearTimeout(timer);
    let via = up.headers.get('x-routed-via') || ''; // the gateway reports the real "<provider>/<model>" here
    try { via = decodeURIComponent(via); } catch {}
    return { ...r.live, via, gw: Number(up.headers.get('x-fallback-attempts')) || 0 };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') { e.message = 'timed out'; e.status = 504; }
    throw e;
  }
}

const safely = (p) => p.catch(() => {});

// mode: 'chat' (SYNTH ASSISTANT) | 'build' (SYNTHCODE). retry: skip the first target (used after a formatting slip).
export async function route({ mode, task, hasImg, payload, retry }) {
  const code = mode === 'build';
  const t0 = Date.now();
  const tid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const all = await plan(code, hasImg);
  const targets = retry ? all.slice(1) : all;
  const fails = [];

  for (const t of targets) {
    if (fails.length >= MAX_ATTEMPTS || Date.now() - t0 > BUDGET_MS) break;
    try {
      const live = await attempt(t, payload, code);
      const ms = Date.now() - t0; // time to first token, including any failed attempts before it
      const via = live.via || t.label;
      // Served by the OpenRouter engine while a gateway is configured counts as a fallback, even if the gateway was skipped on cooldown.
      const viaFallback = sparkEnabled() && t.engine === 'openrouter';
      const failovers = Math.max(fails.length + live.gw, viaFallback ? 1 : 0);
      const status = failovers > 0 ? 'Fallback' : 'Success';
      await Promise.all([
        safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, node: via, failovers, ms, status, img: hasImg, fails: fails.slice(0, 3) }, 500)),
        record({ tid, task, via, ms, fallback: failovers > 0 }),
      ]);
      return { ok: true, tid, stream: relay(live) };
    } catch (e) {
      // Silent failover: recorded for the admin panel, never shown to the user.
      const status = e.status || 0;
      fails.push({ target: t.label, status, msg: String(e.message).slice(0, 140) });
      console.warn('[synthspark] target failed:', t.label, status, e.message);
      const hold = status === 429 ? 120000 : status === 401 || status === 403 ? 30000 : 60000;
      if (t.engine === 'spark') sparkCool.set(t.label, Date.now() + hold); else cooldown(t.model, hold);
      await recordFail(task, t.label);
    }
  }
  await safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, node: '', failovers: fails.length, ms: Date.now() - t0, status: 'Failed', img: hasImg, fails: fails.slice(0, 3) }, 500));
  return { ok: false, tid, noTargets: targets.length === 0 };
}
