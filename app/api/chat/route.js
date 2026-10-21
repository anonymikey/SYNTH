import { approved, logIssue } from '../../../lib/db';
import { apiBase, apiKey, keyProblem } from '../../../lib/env';
import { pickModels, cooldown } from '../../../lib/models';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_ATTEMPTS = 4;      // first try + 3 automatic retries on other models
const FIRST_TOKEN_MS = 14000; // a model that has not started answering by now is skipped
const BUDGET_MS = 36000;     // stop starting new attempts after this, to stay inside maxDuration

// Accepts plain text or OpenAI-style parts. Images must be inline data URIs (never remote URLs).
function clean(c) {
  if (typeof c === 'string') return c.slice(0, 20000);
  if (!Array.isArray(c)) return '';
  let n = 0;
  const out = [];
  for (const p of c) {
    if (p?.type === 'text') out.push({ type: 'text', text: String(p.text || '').slice(0, 20000) });
    else if (p?.type === 'image_url' && n < 4 && /^data:image\/(jpeg|png|webp|gif);base64,/.test(p.image_url?.url || '') && p.image_url.url.length < 1_300_000) { n++; out.push({ type: 'image_url', image_url: { url: p.image_url.url } }); }
  }
  return out.length ? out : '';
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

async function attempt(base, key, model, messages) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FIRST_TOKEN_MS);
  try {
    const up = await fetch(`${base}/chat/completions`, {
      method: 'POST', signal: ac.signal,
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-Title': 'SYNTH' },
      body: JSON.stringify({ model, stream: true, messages }),
    });
    if (!up.ok || !up.body) {
      const e = new Error(brief(await up.text().catch(() => '')) || up.statusText);
      e.status = up.status;
      throw e;
    }
    const reader = up.body.getReader();
    const r = await probe(reader);
    if (r.fail) { reader.cancel().catch(() => {}); const e = new Error(r.fail); e.status = r.fail === 'timed out' ? 504 : 502; throw e; }
    clearTimeout(timer);
    return r.live;
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') { e.message = 'timed out'; e.status = 504; }
    throw e;
  }
}

export async function POST(req) {
  const problem = keyProblem();
  if (problem) return new Response(problem, { status: 500 });
  const base = apiBase(), key = apiKey();

  const { messages, system } = await req.json().catch(() => ({}));
  if (!Array.isArray(messages) || !messages.length) return new Response('No messages.', { status: 400 });
  const msgs = messages.slice(-20).map((x) => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: clean(x.content) }));
  // Context detection: images in the payload decide which models are eligible.
  const hasImg = msgs.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));

  // Learned guidance: only lessons approved in the admin panel are used.
  let sys = typeof system === 'string' ? system : '';
  try {
    const ls = await approved(8);
    if (ls.length) sys += "\n\nGuidance learned from past use (advisory only; the user's request and the rules above take priority):\n" + ls.map((l) => '- ' + l.text.slice(0, 300)).join('\n');
  } catch {}
  const payload = [...(sys ? [{ role: 'system', content: sys.slice(0, 60000) }] : []), ...msgs];

  const t0 = Date.now();
  const candidates = await pickModels(hasImg);
  let tried = 0;
  for (const m of candidates) {
    if (tried >= MAX_ATTEMPTS || Date.now() - t0 > BUDGET_MS) break;
    tried++;
    try {
      const live = await attempt(base, key, m.id, payload);
      return new Response(relay(live), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform' } });
    } catch (e) {
      // Silent failover: recorded for the admin panel, never shown to the user.
      console.warn('[synth] model failed:', m.id, e.status || '', e.message);
      cooldown(m.id, e.status === 429 ? 120000 : e.status === 401 || e.status === 403 ? 30000 : 60000);
      await logIssue({ model: m.id, status: e.status || 0, msg: String(e.message).slice(0, 160), img: hasImg });
    }
  }
  return new Response(
    hasImg && !candidates.length
      ? 'Image reading is unavailable right now. Please try again shortly, or send your message without an image.'
      : 'SYNTH is busy right now. Please try again in a moment.',
    { status: 503 },
  );
}
