// SYNTHSPARK: routing engine. Providers come from providerConfig() (OpenRouter by default, SPARK gateway optional) in the
// configured order. Targets are tried until one starts answering. A target that errors, rejects the key, breaks the stream
// or shows no token within 14 s is skipped silently, so a dead provider never leaves the user waiting.
import { apiBase, apiKey, providerConfig, sparkBase, sparkKey } from './env';
import { pickModels, cooldown } from './models';
import { pushCapped } from './db';
import { record, recordFail } from './core';

const MAX_ATTEMPTS = 4;       // first try + 3 automatic retries, across all providers
const PER_PROVIDER = 2;       // with two providers, each gets this many tries before the other one is used
const SPARK_TRIES = 2;        // gateway routes available per request
const FIRST_TOKEN_MS = 14000; // no first token by now: skip this target
const BUDGET_MS = 36000;      // no new attempts after this, to stay inside the function time limit
const DOWN_MS = 90000;        // a provider that just failed is tried last for this long

const env = (k) => (process.env[k] || '').trim();
const sparkCool = (globalThis.__sparkCool ||= new Map());
const provDown = (globalThis.__provDown ||= new Map());

export const sparkEnabled = () => providerConfig().active.includes('spark');

// Gateway model strings. "auto", "auto:smart", "auto:reliable" and "auto:<profile>" are FreeLLMAPI routing modes.
// The gateway itself restricts image requests to vision-capable models.
const sparkModels = (code) => [...new Set((code ? [env('SPARK_CODE_MODEL'), 'auto:smart', 'auto:reliable'] : [env('SPARK_VISION_MODEL'), 'auto', 'auto:reliable']).filter(Boolean))].slice(0, SPARK_TRIES);

async function targetsFor(provider, code, hasImg) {
  if (provider === 'spark') {
    const all = sparkModels(code).map((model) => ({ engine: 'spark', base: sparkBase(), key: sparkKey(), model, label: 'spark/' + model }));
    const now = Date.now();
    return [...all.filter((t) => !(sparkCool.get(t.label) > now)), ...all.filter((t) => sparkCool.get(t.label) > now)]; // recently failing routes last
  }
  return (await pickModels(hasImg, code ? 'code' : 'chat')).map((m) => ({ engine: 'openrouter', base: apiBase(), key: apiKey(), model: m.id, label: 'openrouter/' + m.id }));
}

// Targets in provider order. A provider that just failed moves behind the healthy ones (still a last resort).
async function plan(code, hasImg) {
  const active = providerConfig().active;
  const now = Date.now();
  const order = [...active.filter((p) => !(provDown.get(p) > now)), ...active.filter((p) => provDown.get(p) > now)];
  const out = [];
  for (const p of order) out.push(...(await targetsFor(p, code, hasImg)));
  return out;
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
  const cfg = providerConfig();
  const primary = cfg.active[0]; // the provider the configuration puts first
  const t0 = Date.now();
  const tid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const all = await plan(code, hasImg);
  const targets = retry ? all.slice(1) : all;
  const cap = new Set(targets.map((t) => t.engine)).size > 1 ? PER_PROVIDER : MAX_ATTEMPTS;
  const used = {};
  const fails = [];

  for (const t of targets) {
    if (fails.length >= MAX_ATTEMPTS || Date.now() - t0 > BUDGET_MS) break;
    if ((used[t.engine] || 0) >= cap) continue; // this provider has had its turn; try the next one
    used[t.engine] = (used[t.engine] || 0) + 1;
    try {
      const live = await attempt(t, payload, code);
      provDown.delete(t.engine);
      const ms = Date.now() - t0; // time to first token, including any failed attempts before it
      const via = live.via || t.label;
      // Served by a provider other than the configured first choice counts as a fallback.
      const viaFallback = cfg.active.length > 1 && t.engine !== primary;
      const failovers = Math.max(fails.length + live.gw, viaFallback ? 1 : 0);
      const status = failovers > 0 ? 'Fallback' : 'Success';
      await Promise.all([
        safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, provider: t.engine, node: via, failovers, ms, status, img: hasImg, fails: fails.slice(0, 3) }, 500)),
        record({ tid, task, via, ms, fallback: failovers > 0 }),
      ]);
      return { ok: true, tid, stream: relay(live) };
    } catch (e) {
      // Silent failover: recorded for the admin panel, never shown to the user.
      const status = e.status || 0;
      fails.push({ provider: t.engine, target: t.label, status, msg: String(e.message).slice(0, 140) });
      console.warn('[synthspark] target failed:', t.label, status, e.message);
      const hold = status === 429 ? 120000 : status === 401 || status === 403 ? 30000 : 60000;
      if (t.engine === 'spark') sparkCool.set(t.label, Date.now() + hold); else cooldown(t.model, hold);
      // The key was rejected, or the gateway is unreachable or hanging: its other routes will fail the same way, so move on at once.
      if (status === 401 || (t.engine === 'spark' && (status === 504 || !status))) used[t.engine] = cap;
      if (used[t.engine] >= cap) provDown.set(t.engine, Date.now() + DOWN_MS);
      await recordFail(task, t.label);
    }
  }
  for (const p of Object.keys(used)) provDown.set(p, Date.now() + DOWN_MS); // nobody answered: remember who was tried
  await safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, provider: '', node: '', failovers: fails.length, ms: Date.now() - t0, status: 'Failed', img: hasImg, fails: fails.slice(0, 3) }, 500));
  return { ok: false, tid, noTargets: targets.length === 0 };
}
