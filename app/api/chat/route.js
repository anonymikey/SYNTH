import { approved } from '../../../lib/db';
import { keyProblem } from '../../../lib/env';
import { classify } from '../../../lib/core';
import { route, sparkEnabled } from '../../../lib/spark';
export const runtime = 'nodejs';
export const maxDuration = 60;

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
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.filter((p) => p.type === 'text').map((p) => p.text).join(' ') : '');

export async function POST(req) {
  // Needs at least one engine: the SYNTHSPARK gateway or an OpenRouter key.
  if (!sparkEnabled()) { const problem = keyProblem(); if (problem) return new Response(problem, { status: 500 }); }

  const { messages, system, mode, retry } = await req.json().catch(() => ({}));
  if (!Array.isArray(messages) || !messages.length) return new Response('No messages.', { status: 400 });
  const msgs = messages.slice(-20).map((x) => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: clean(x.content) }));
  // Context detection: images in the payload decide which models are eligible.
  const hasImg = msgs.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));
  const m = mode === 'build' ? 'build' : 'chat';

  // Learned guidance: only lessons approved in the admin panel are used.
  let sys = typeof system === 'string' ? system : '';
  const edit = /Current file:/.test(sys);
  try {
    const ls = await approved(8);
    if (ls.length) sys += "\n\nGuidance learned from past use (advisory only; the user's request and the rules above take priority):\n" + ls.map((l) => '- ' + l.text.slice(0, 300)).join('\n');
  } catch {}
  const payload = [...(sys ? [{ role: 'system', content: sys.slice(0, 60000) }] : []), ...msgs];

  const lastUser = [...msgs].reverse().find((x) => x.role === 'user');
  const task = classify(textOf(lastUser?.content), { mode: m, hasImg, edit });

  const r = await route({ mode: m, task, hasImg, payload, retry: retry === true });
  if (r.ok) return new Response(r.stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'x-synth-tid': r.tid } });
  return new Response(
    hasImg && r.noTargets
      ? 'Image reading is unavailable right now. Please try again shortly, or send your message without an image.'
      : 'SYNTH is busy right now. Please try again in a moment.',
    { status: 503 },
  );
}
