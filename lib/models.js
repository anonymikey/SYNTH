// Server-only: ranked OpenRouter free-model lineup, lane-aware ordering and short cool-downs for failing models.
import { apiBase, apiKey } from './env';

// Not general chat models (safety classifiers, embeddings, etc.).
const NOT_CHAT = /(safety|guard|moderat|embed|rerank|reward|classif|whisper|tts|speech|diffusion|image-gen)/i;
const GOOD = /(gpt-oss|llama-3\.3|llama-4|qwen3|qwen-3|deepseek|glm|kimi|gemma-3|mistral|hermes|nemotron-(super|ultra))/i;
const CODE_LEAN = /(deepseek|coder|code|qwen|glm|kimi|gpt-oss|devstral|codestral|nemotron|minimax|opencode)/i;
function score(m) {
  const t = m.id + ' ' + (m.name || '');
  const size = (t.match(/(\d+(?:\.\d+)?)\s*b\b/i) || [])[1];
  return Math.min(+size || 0, 500) / 25 + Math.log2((m.context_length || 8000) / 8000)
    + (/instruct|chat|-it\b/i.test(m.id) ? 1 : 0) + (GOOD.test(m.id) ? 2 : 0)
    - (/(nano|mini|tiny|small|lite|\b[1-4]b\b)/i.test(t) ? 3 : 0);
}

const cache = (globalThis.__synthModels ||= { t: 0, list: [] });
const cool = (globalThis.__synthCool ||= new Map());

export async function rankedModels() {
  if (cache.list.length && Date.now() - cache.t < 10 * 60 * 1000) return cache.list;
  const base = apiBase(), key = apiKey();
  const d = (process.env.DEFAULT_MODEL || '').trim();
  const openrouter = base.includes('openrouter');
  try {
    const r = await fetch(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, cache: 'no-store' });
    let list = (await r.json()).data || [];
    if (openrouter) list = list.filter((m) => m.id.endsWith(':free'));
    list = list
      .filter((m) => !NOT_CHAT.test(m.id + ' ' + (m.name || '')) && (!m.architecture?.output_modalities || m.architecture.output_modalities.includes('text')))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 30)
      .map((m) => ({
        id: m.id, name: (m.name || m.id).replace(/\s*\(free\)\s*$/i, ''), ctx: m.context_length || 0,
        vision: m.architecture?.input_modalities ? m.architecture.input_modalities.includes('image') : undefined,
      }));
    if (d && (!openrouter || d.endsWith(':free'))) {
      const i = list.findIndex((m) => m.id === d);
      list.unshift(i >= 0 ? list.splice(i, 1)[0] : { id: d, name: d, ctx: 0 });
    }
    if (list.length) { cache.list = list; cache.t = Date.now(); }
    return list.length ? list : cache.list;
  } catch {
    return cache.list; // a stale list is better than none
  }
}

// Eligible models in priority order for a lane:
//   'chat' = SYNTH ASSISTANT (vision-capable models first), 'code' = SYNTHCODE (code/reasoning-leaning first), 'text' = plain ranking.
// With an image, only vision-capable models are eligible. Models that failed recently go last.
export async function pickModels(hasImg, lane = 'text') {
  const openrouter = apiBase().includes('openrouter');
  const all = await rankedModels();
  const vision = (m) => m.vision === true || (m.vision === undefined && !openrouter);
  const pool = hasImg ? all.filter(vision) : all;
  const lean = lane === 'code' ? (m) => CODE_LEAN.test(m.id) : lane === 'chat' ? vision : () => false;
  const ordered = [...pool.filter(lean), ...pool.filter((m) => !lean(m))];
  const now = Date.now();
  return [...ordered.filter((m) => !(cool.get(m.id) > now)), ...ordered.filter((m) => cool.get(m.id) > now)];
}
export const cooldown = (id, ms) => cool.set(id, Date.now() + ms);
