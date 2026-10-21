import { apiBase, apiKey } from '../../../lib/env';
export const runtime = 'nodejs';

// Things that are not general chat models (safety classifiers, embeddings, etc.).
const NOT_CHAT = /(safety|guard|moderat|embed|rerank|reward|classif|whisper|tts|speech|diffusion|image-gen)/i;
const GOOD = /(gpt-oss|llama-3\.3|llama-4|qwen3|qwen-3|deepseek|glm|kimi|gemma-3|mistral|hermes|nemotron-(super|ultra))/i;
function score(m) {
  const t = m.id + ' ' + (m.name || '');
  const size = (t.match(/(\d+(?:\.\d+)?)\s*b\b/i) || [])[1];
  return Math.min(+size || 0, 500) / 25 + Math.log2((m.context_length || 8000) / 8000)
    + (/instruct|chat|-it\b/i.test(m.id) ? 1 : 0) + (GOOD.test(m.id) ? 2 : 0)
    - (/(nano|mini|tiny|small|lite|\b[1-4]b\b)/i.test(t) ? 3 : 0);
}

export async function GET() {
  const base = apiBase(), key = apiKey();
  const d = (process.env.DEFAULT_MODEL || '').trim();
  try {
    const r = await fetch(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, next: { revalidate: 3600 } });
    let list = (await r.json()).data || [];
    if (base.includes('openrouter')) list = list.filter((m) => m.id.endsWith(':free'));
    list = list.filter((m) => !NOT_CHAT.test(m.id + ' ' + (m.name || '')) && (!m.architecture?.output_modalities || m.architecture.output_modalities.includes('text')));
    list.sort((a, b) => score(b) - score(a));
    const models = list.slice(0, 40).map((m) => ({
      id: m.id, name: (m.name || m.id).replace(/\s*\(free\)\s*$/i, ''), ctx: m.context_length || 0,
      vision: m.architecture?.input_modalities ? m.architecture.input_modalities.includes('image') : undefined,
    }));
    if (d) { const i = models.findIndex((m) => m.id === d); const hit = i >= 0 ? models.splice(i, 1)[0] : { id: d, name: d, ctx: 0 }; models.unshift(hit); }
    return Response.json({ models });
  } catch {
    return Response.json({ models: d ? [{ id: d, name: d, ctx: 0 }] : [] });
  }
}
