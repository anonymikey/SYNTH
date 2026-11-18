// Server-only: ranked OpenRouter free-model lineup, lane-aware ordering and short cool-downs for failing models.
import { apiBase, apiKey } from './env.js';

// Not general chat models (safety classifiers, embeddings, etc.).
const NOT_CHAT = /(safety|guard|moderat|embed|rerank|reward|classif|whisper|tts|speech|diffusion|image-gen)/i;
const GOOD = /(gpt-oss|llama-3\.3|llama-4|qwen3|qwen-3|deepseek|glm|kimi|gemma-3|mistral|hermes|nemotron-(super|ultra))/i;
const CODE_LEAN = /(deepseek|coder|code|qwen|glm|kimi|gpt-oss|devstral|codestral|nemotron|minimax|opencode)/i;
const STALE_CATALOG_MS = 30 * 60 * 1000;
const cache = (globalThis.__synthModels ||= { t: 0, list: [], base: '' });
const cool = (globalThis.__synthCool ||= new Map());

function score(m) {
  const t = m.id + ' ' + (m.name || '');
  const size = (t.match(/(\d+(?:\.\d+)?)\s*b\b/i) || [])[1];
  return Math.min(+size || 0, 500) / 25 + Math.log2((m.context_length || 8000) / 8000)
    + (/instruct|chat|-it\b/i.test(m.id) ? 1 : 0) + (GOOD.test(m.id) ? 2 : 0)
    - (/(nano|mini|tiny|small|lite|\b[1-4]b\b)/i.test(t) ? 3 : 0);
}

function retryAfterMs(value, now = Date.now()) {
  if (typeof value !== 'string' || !value.trim()) return 0;
  const header = value.trim();
  const ms = /^\d+(?:\.\d+)?$/.test(header) ? Number(header) * 1000 : Math.max(0, Date.parse(header) - now);
  return Number.isFinite(ms) ? Math.min(24 * 60 * 60 * 1000, Math.max(0, ms)) : 0;
}

function catalogError(message, status = 0, retryAfter = 0) {
  const error = new Error(String(message || 'Model catalog request failed.').replace(/[\r\n\t]+/g, ' ').slice(0, 180));
  error.status = status;
  error.retryAfterMs = retryAfter;
  return error;
}

export async function rankedModels({ allowStale = true, refresh = false } = {}) {
  const base = apiBase(), key = apiKey();
  const d = (process.env.DEFAULT_MODEL || '').trim();
  const openrouter = /openrouter/i.test(base);
  const sameBase = cache.base === base;
  const age = sameBase ? Date.now() - cache.t : Infinity;
  if (!refresh && cache.list.length && age < 10 * 60 * 1000) return cache.list;

  try {
    const response = await fetch(`${base}/models`, {
      headers: key ? { Authorization: `Bearer ${key}` } : {},
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    const retry = retryAfterMs(response.headers.get('retry-after'));
    if (!response.ok) throw catalogError(`Model catalog returned HTTP ${response.status}.`, response.status, retry);
    let payload;
    try { payload = await response.json(); }
    catch { throw catalogError('Model catalog returned invalid JSON.', response.status); }
    if (!Array.isArray(payload?.data)) throw catalogError('Model catalog response did not contain a model list.', response.status);

    let list = payload.data
      .filter((m) => m && typeof m.id === 'string' && m.id.length > 0)
      .filter((m) => !openrouter || m.id.endsWith(':free'))
      .filter((m) => !NOT_CHAT.test(m.id + ' ' + (m.name || '')) && (!m.architecture?.output_modalities || m.architecture.output_modalities.includes('text')))
      .sort((a, b) => score(b) - score(a))
      .slice(0, 30)
      .map((m) => ({
        id: m.id, name: (m.name || m.id).replace(/\s*\(free\)\s*$/i, ''), ctx: m.context_length || 0,
        vision: m.architecture?.input_modalities ? m.architecture.input_modalities.includes('image') : undefined,
      }));

    // A configured default is a preference, not evidence that an upstream supports the model.
    if (d && (!openrouter || d.endsWith(':free'))) {
      const i = list.findIndex((m) => m.id === d);
      if (i >= 0) list.unshift(list.splice(i, 1)[0]);
    }
    cache.list = list;
    cache.t = Date.now();
    cache.base = base;
    return list;
  } catch (error) {
    if (allowStale && cache.list.length && sameBase && age < STALE_CATALOG_MS) return cache.list;
    throw error;
  }
}

// Eligible models in priority order for a lane:
//   'chat' = SYNTH ASSISTANT (vision-capable models first), 'code' = SYNTHCODE (code/reasoning-leaning first), 'text' = plain ranking.
// With an image, only vision-capable models are eligible. Models that failed recently go last.
export async function pickModels(hasImg, lane = 'text', options = {}) {
  const openrouter = /openrouter/i.test(apiBase());
  const all = await rankedModels(options);
  const vision = (m) => m.vision === true || (m.vision === undefined && !openrouter);
  const pool = hasImg ? all.filter(vision) : all;
  const lean = lane === 'code' ? (m) => CODE_LEAN.test(m.id) : lane === 'chat' ? vision : () => false;
  const ordered = [...pool.filter(lean), ...pool.filter((m) => !lean(m))];
  const now = Date.now();
  return [...ordered.filter((m) => !(cool.get(m.id) > now)), ...ordered.filter((m) => cool.get(m.id) > now)];
}
export function cooldownUntil(id, until) {
  const deadline = Math.max(Number(cool.get(id)) || 0, Number(until) || 0);
  cool.set(id, deadline);
  return deadline;
}
export const cooldown = (id, ms) => cooldownUntil(id, Date.now() + Math.max(0, Number(ms) || 0));
export const isCoolingDown = (id) => cool.get(id) > Date.now();
