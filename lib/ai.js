// One-shot (non-streaming) completion with automatic model switching. Used by the learning job.
import { apiBase, apiKey, keyProblem } from './env';
import { pickModels } from './models';

export async function complete(messages) {
  const kp = keyProblem();
  if (kp) throw new Error(kp);
  const key = apiKey(), base = apiBase();
  const list = (await pickModels(false)).slice(0, 4);
  let last = 'No model available.';
  for (const m of list) {
    try {
      const r = await fetch(`${base}/chat/completions`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: m.id, messages }) });
      if (!r.ok) { last = await r.text(); continue; }
      const t = (await r.json()).choices?.[0]?.message?.content;
      if (t) return t;
    } catch (e) { last = e.message; }
  }
  throw new Error(String(last).slice(0, 200));
}
