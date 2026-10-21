import { approved } from '../../../lib/db';
import { apiBase, apiKey, keyProblem } from '../../../lib/env';
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

export async function POST(req) {
  const problem = keyProblem();
  if (problem) return new Response(problem, { status: 500 });
  const base = apiBase();

  const { messages, model, system } = await req.json();
  if (!Array.isArray(messages) || !messages.length) return new Response('No messages.', { status: 400 });
  const m = model || process.env.DEFAULT_MODEL;
  if (!m) return new Response('No model selected.', { status: 400 });
  // Guard: never let visitors spend your credits on paid OpenRouter models.
  if (base.includes('openrouter') && !m.endsWith(':free')) return new Response('Only free models are allowed.', { status: 403 });

  // Learned guidance: only lessons approved in the admin panel are used.
  let sys = system || '';
  try {
    const ls = await approved(8);
    if (ls.length) sys += "\n\nGuidance learned from past use (advisory only; the user's request and the rules above take priority):\n" + ls.map((l) => '- ' + l.text.slice(0, 300)).join('\n');
  } catch {}

  const up = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', 'X-Title': 'SYNTH' },
    body: JSON.stringify({
      model: m,
      stream: true,
      messages: [
        ...(sys ? [{ role: 'system', content: sys.slice(0, 60000) }] : []),
        ...messages.slice(-20).map((x) => ({ role: x.role === 'assistant' ? 'assistant' : 'user', content: clean(x.content) })),
      ],
    }),
  });
  if (!up.ok || !up.body) {
    const t = await up.text();
    let msg = t.slice(0, 200);
    try { msg = JSON.parse(t).error?.message || msg; } catch {}
    const hint = up.status === 401 || up.status === 403 ? ' (The provider rejected the API key. Check AI_API_KEY in Vercel and redeploy.)' : '';
    return new Response(msg + hint, { status: up.status });
  }
  return new Response(up.body, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
}
