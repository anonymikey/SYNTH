// One-shot (non-streaming) completion with free-model fallback. Used by the learning job.
const base = () => process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
export async function complete(messages) {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error('AI_API_KEY is not set.');
  let ids = [];
  try {
    const j = await (await fetch(`${base()}/models`, { headers: { Authorization: `Bearer ${key}` } })).json();
    ids = (j.data || []).map((m) => m.id);
    if (base().includes('openrouter')) ids = ids.filter((i) => i.endsWith(':free'));
  } catch {}
  const list = [process.env.DEFAULT_MODEL, ...ids.slice(0, 6)].filter(Boolean).slice(0, 4);
  let last = 'No model available.';
  for (const model of list) {
    try {
      const r = await fetch(`${base()}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages }) });
      if (!r.ok) { last = await r.text(); continue; }
      const t = (await r.json()).choices?.[0]?.message?.content;
      if (t) return t;
    } catch (e) { last = e.message; }
  }
  throw new Error(String(last).slice(0, 200));
}
