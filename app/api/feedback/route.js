import { rate } from '../../../lib/db.js';
import { rating } from '../../../lib/core.js';
import { mediaRateLimit } from '../../../lib/media-limit.js';

const CATEGORIES = new Set(['inaccurate', 'poor-explanation', 'irrelevant', 'incomplete', 'other']);
const cleanComment = (s) => String(s || '').trim().replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\d{7,}/g, '[number]').slice(0, 1000);

export async function POST(req) {
  try {
    const body = await req.json();
    const id = typeof body.id === 'string' ? body.id.slice(0, 64) : '';
    const value = body.value;
    if (!/^[a-z0-9_-]{6,64}$/i.test(id) || ![-1, 0, 1].includes(value)) return Response.json({ ok: false, error: 'Invalid response rating.' }, { status: 400 });
    const category = value === -1 ? (CATEGORIES.has(body.category) ? body.category : body.category == null ? 'other' : '') : '';
    if (value === -1 && !category) return Response.json({ ok: false, error: 'Choose a feedback category.' }, { status: 400 });
    if (typeof body.comment === 'string' && body.comment.length > 2000) return Response.json({ ok: false, error: 'Feedback is too long.' }, { status: 413 });
    const comment = value === -1 ? cleanComment(body.comment) : '';
    const limit = await mediaRateLimit(req, 'response-feedback', 120);
    if (!limit.allowed) return Response.json({ ok: false, error: 'Too many feedback updates. Try again later.' }, { status: 429, headers: { 'Retry-After': '3600' } });
    const result = await rate(id, value, { category, comment });
    if (!result) return Response.json({ ok: false, error: 'This response is no longer available for feedback.' }, { status: 404 });
    if (result.changed && result.ev.tid) await rating(result.ev.tid, result.prev, value); // update the existing model training signal only when the vote changes
    return Response.json({ ok: true, value: result.ev.fb, feedback: result.ev.feedback || null, changed: result.changed });
  } catch { return Response.json({ ok: false, error: 'Feedback could not be saved.' }, { status: 500 }); }
}
