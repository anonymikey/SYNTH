// One-shot (non-streaming) completion for the learning job, using the same providers and order as chat.
// Every call has a timeout, so the job can never hang on a dead provider.
import { apiBase, apiKey, keyProblem, providerConfig, sparkBase, sparkKey } from './env';
import { pickModels } from './models';

const CALL_MS = 14000;
const BUDGET_MS = 40000;

async function ask(t, messages) {
  const r = await fetch(`${t.base}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(CALL_MS),
    headers: { Authorization: `Bearer ${t.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: t.model, messages }),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => '')).slice(0, 200) || r.statusText);
  const text = (await r.json()).choices?.[0]?.message?.content;
  if (!text) throw new Error('empty response');
  let via = r.headers.get('x-routed-via') || '';
  try { via = decodeURIComponent(via); } catch {}
  return { text, model: via || t.label };
}

// Returns { text, model } where model is the label of whoever answered (e.g. "openrouter/<id>").
export async function completeWith(messages) {
  const cfg = providerConfig();
  if (!cfg.active.length) throw new Error(keyProblem() || 'No AI provider is configured.');
  const t0 = Date.now();
  let last = 'No model available.';
  for (const p of cfg.active) {
    const targets = p === 'spark'
      ? [{ base: sparkBase(), key: sparkKey(), model: 'auto:smart', label: 'spark/auto:smart' }]
      : (await pickModels(false, 'text')).slice(0, 3).map((m) => ({ base: apiBase(), key: apiKey(), model: m.id, label: 'openrouter/' + m.id }));
    for (const t of targets) {
      if (Date.now() - t0 > BUDGET_MS) break;
      try { return await ask(t, messages); } catch (e) { last = e.message; }
    }
  }
  throw new Error(String(last).slice(0, 200));
}
export const complete = async (messages) => (await completeWith(messages)).text;
