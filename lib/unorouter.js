// UnoRouter is an optional server-side fallback. Keep its host fixed and verify every target against the live free catalog.
const BASE_URL = 'https://api.unorouter.com/v1';
const MAX_MODELS = 4;
const MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const CATALOG_CACHE_MS = 60_000;
const CATALOG_TIMEOUT_MS = 3500;
const FREE_MODEL_ID = /^[a-z0-9][a-z0-9._-]{0,63}(?:\/[a-z0-9][a-z0-9._-]{0,63})?:free$/i;
const PREFERRED_TEXT_MODEL = /(?:deepseek|qwen|llama|gemma|glm|mistral|gpt[-_]?oss|nemotron|codestral|devstral|minimax|gemini|intern)/i;
const catalog = (globalThis.__synthUnoCatalog ||= { t: 0, models: [], pending: null });

const cleanSecret = (value) => String(value || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();

export const unorouterBase = () => BASE_URL;
export const unorouterKey = () => cleanSecret(process.env.UNOROUTER_API_KEY);
export const isUnoFreeModelId = (value) => typeof value === 'string' && FREE_MODEL_ID.test(value.trim());

export function unorouterFreeModels() {
  const raw = String(process.env.UNOROUTER_FREE_MODELS || '').trim();
  if (!raw) return [];
  return [...new Set(raw.split(/[\s,]+/).map((value) => value.trim()).filter(isUnoFreeModelId))].slice(0, MAX_MODELS);
}

export async function verifiedUnoFreeModels() {
  const now = Date.now();
  if (catalog.t && now - catalog.t < CATALOG_CACHE_MS) return chooseEligible(catalog.models);
  if (catalog.pending) return catalog.pending;
  catalog.pending = (async () => {
    const response = await fetch(`${BASE_URL}/models`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw Object.assign(new Error(`Live catalog returned HTTP ${response.status}.`), { status: response.status });
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error('Live catalog returned invalid JSON.'); }
    if (!Array.isArray(payload?.data)) throw new Error('Live catalog did not contain model data.');
    catalog.models = payload.data
      .filter((model) => model && isUnoFreeModelId(model.id))
      .filter((model) => Array.isArray(model.supported_endpoint_types) && model.supported_endpoint_types.includes('openai'))
      .filter((model) => !/(?:embed|image|audio|speech|rerank)/i.test(model.id))
      .filter((model) => PREFERRED_TEXT_MODEL.test(model.id))
      .map((model) => ({ id: model.id, context: Number(model.context_length) || 0 }))
      .sort((a, b) => modelScore(b) - modelScore(a));
    catalog.t = Date.now();
    return chooseEligible(catalog.models);
  })();
  try { return await catalog.pending; }
  finally { catalog.pending = null; }
}

function modelScore(model) {
  const id = model.id;
  const match = id.match(/deepseek|qwen|llama|gemma|glm|mistral|gpt[-_]?oss|nemotron|codestral|devstral|minimax|gemini|intern/i);
  const family = (match?.[0] || '').toLowerCase();
  const preference = ['deepseek', 'qwen', 'llama', 'gemma', 'glm', 'mistral', 'gpt-oss', 'gpt_oss', 'nemotron', 'codestral', 'devstral', 'minimax', 'gemini', 'intern'].indexOf(family);
  return (preference < 0 ? 0 : 100 - preference) + Math.log2(Math.max(model.context, 2048) / 2048);
}

function chooseEligible(models) {
  const configured = unorouterFreeModels();
  if (!configured.length) return models.slice(0, MAX_MODELS).map((model) => model.id);
  const available = new Set(models.map((model) => model.id));
  return configured.filter((model) => available.has(model)).slice(0, MAX_MODELS);
}

export function unorouterModelConfigNote() {
  const raw = String(process.env.UNOROUTER_FREE_MODELS || '').trim();
  if (!raw) return 'SYNTH Connect uses its live catalog and selects only verified free OpenAI-compatible text models.';
  const configured = raw.split(/[\s,]+/).filter(Boolean);
  return configured.some((model) => !isUnoFreeModelId(model))
    ? 'SYNTH Connect ignored invalid model entries; only live catalog IDs ending exactly in :free can be used.'
    : 'Configured SYNTH Connect models are checked against the live catalog and skipped if unavailable.';
}

export function unorouterProblem() {
  if (!unorouterKey()) return 'UnoRouter is enabled but its server API key is not configured.';
  if (!String(process.env.UPSTASH_REDIS_REST_URL || '').trim() || !String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()) return 'UnoRouter needs connected shared workspace storage to enforce its free-model request limits safely.';
  const raw = String(process.env.UNOROUTER_FREE_MODELS || '').trim();
  if (raw && !unorouterFreeModels().length) return 'UnoRouter is enabled but no valid :free model IDs are configured.';
  return '';
}

// Supports RFC delay-seconds and HTTP-date. Bound very long or malformed headers so a
// bad upstream value cannot create an unbounded cooldown or delay other providers.
export function parseUnoRetryAfter(value, now = Date.now()) {
  if (typeof value !== 'string') return 0;
  const header = value.trim();
  if (!header) return 0;
  let milliseconds = 0;
  if (/^\d+(?:\.\d+)?$/.test(header)) milliseconds = Number(header) * 1000;
  else {
    const date = Date.parse(header);
    if (Number.isFinite(date)) milliseconds = Math.max(0, date - now);
  }
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 0;
  return Math.min(MAX_RETRY_AFTER_MS, Math.ceil(milliseconds));
}

export const UNO_MAX_COOLDOWN_MS = MAX_RETRY_AFTER_MS;
export const UNO_DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120000;
export const UNO_MIN_MODEL_INTERVAL_MS = 60000;
export const UNO_COOLDOWN_STORAGE_TIMEOUT_MS = 750;
