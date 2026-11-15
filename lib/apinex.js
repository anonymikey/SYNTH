// Server-only APInex integration. Never accept a client-controlled host or paid model ID.
const API_ROOT = 'https://api.apinex.bond/v1';
const CATALOG_URL = 'https://apinex.bond/api/public/models';
const DEFAULT_FREE_MODELS = [
  'free/deepseek-v4.1-flash',
  'free/qwen-3.8-max',
  'free/gemini-3.8-flash',
];
const MAX_MODELS = 5;
const CATALOG_TIMEOUT_MS = 1_500;
const QUOTA_TIMEOUT_MS = 1_500;
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const FREE_MODEL_ID = /^free\/[a-z0-9][a-z0-9._-]{0,79}$/i;

let catalogPromise = null;

const cleanSecret = (value) => String(value || '').trim().replace(/^['"]+|['"]+$/g, '').replace(/^Bearer\s+/i, '').trim();

export const APINEX_MIN_REQUEST_INTERVAL_MS = 4_200;
export const APINEX_DEFAULT_RATE_LIMIT_COOLDOWN_MS = 120_000;
export const APINEX_DEFAULT_FAILURE_COOLDOWN_MS = 60_000;
export const APINEX_DEFAULT_QUOTA_COOLDOWN_MS = 15 * 60_000;
export const APINEX_MAX_COOLDOWN_MS = MAX_COOLDOWN_MS;
export const APINEX_STORAGE_TIMEOUT_MS = 750;
export const APINEX_ACCOUNT_COOLDOWN_KEY = 'chat:cooldown:apinex:account';
export const APINEX_CIRCUIT_BREAKER_KEY = 'chat:cooldown:apinex:circuit';

export const apinexBase = () => API_ROOT;
export const apinexKey = () => cleanSecret(process.env.APINEX_API_KEY);
export const isApinexFreeModelId = (value) => typeof value === 'string' && FREE_MODEL_ID.test(value.trim());

export function apinexFreeModels() {
  const raw = String(process.env.APINEX_FREE_MODELS || '').trim();
  const candidates = raw ? raw.split(/[\s,]+/).filter(Boolean) : DEFAULT_FREE_MODELS;
  return [...new Set(candidates.map((value) => value.trim()).filter(isApinexFreeModelId))].slice(0, MAX_MODELS);
}

export function apinexModelConfigNote() {
  const raw = String(process.env.APINEX_FREE_MODELS || '').trim();
  if (!raw) return '';
  const configured = raw.split(/[\s,]+/).filter(Boolean);
  return configured.some((model) => !isApinexFreeModelId(model))
    ? 'APInex ignored malformed or non-free model entries; only free/ model IDs are considered.'
    : '';
}

export function apinexProblem() {
  if (!apinexKey()) return 'APInex is enabled but its server API key is not configured.';
  if (!apinexFreeModels().length) return 'APInex is enabled but has no valid free/ model candidates.';
  if (!String(process.env.UPSTASH_REDIS_REST_URL || '').trim() || !String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()) {
    return 'APInex needs connected shared workspace storage to enforce its account-wide request limit safely.';
  }
  return '';
}

function isZeroPriceFreeModel(model) {
  return !!model
    && typeof model.id === 'string'
    && isApinexFreeModelId(model.id)
    && model.allowFree === true
    && model.health === 'live'
    && model.dollarsPer1M === 0
    && model.outputDollarsPer1M === 0;
}

async function liveCatalog() {
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    try {
      const response = await fetch(CATALOG_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(CATALOG_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error('catalog unavailable');
      const payload = await response.json();
      if (!Array.isArray(payload?.models)) throw new Error('invalid catalog');
      return payload.models.filter(isZeroPriceFreeModel);
    } catch {
      return null;
    } finally {
      catalogPromise = null;
    }
  })();
  return catalogPromise;
}

// Select one candidate per task. APInex's RPM is account-wide, so trying a second model
// after a failed request would consume another shared inference slot in the same task.
export async function apinexChatTargets() {
  const key = apinexKey();
  const candidates = apinexFreeModels();
  if (!key || !candidates.length) return [];
  const models = await liveCatalog();
  if (!models) return [];
  const eligibleIds = new Set(models.map((model) => model.id));
  const model = candidates.find((candidate) => eligibleIds.has(candidate));
  if (!model) return [];
  return [{ engine: 'apinex', base: API_ROOT, key, model, label: `apinex/${model}` }];
}

export function parseApinexRetryAfter(value, now = Date.now()) {
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
  return Math.min(MAX_COOLDOWN_MS, Math.ceil(milliseconds));
}

export function parseApinexResetAt(value, now = Date.now()) {
  if (value == null || value === '') return 0;
  const text = String(value).trim();
  const numeric = Number(text);
  const timestamp = /^\d+(?:\.\d+)?$/.test(text) && numeric > 1_000_000_000
    ? numeric * 1000
    : Date.parse(text);
  if (!Number.isFinite(timestamp) || timestamp <= now) return 0;
  return Math.min(timestamp, now + MAX_COOLDOWN_MS);
}

export function parseApinexCooldown(headers, now = Date.now()) {
  const retryAfter = parseApinexRetryAfter(headers?.get?.('retry-after'), now);
  const resetAt = parseApinexResetAt(headers?.get?.('x-ratelimit-reset'), now);
  const resetDelay = resetAt ? resetAt - now : 0;
  return Math.min(MAX_COOLDOWN_MS, Math.max(retryAfter, resetDelay));
}

// Called only after a zero-price free-model request returns 402. Keep no balance or
// allowance information; only return the next reset deadline for a shared cooldown.
export async function apinexQuotaResetAt() {
  const key = apinexKey();
  if (!key) return 0;
  try {
    const response = await fetch(`${API_ROOT}/subscription`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(QUOTA_TIMEOUT_MS),
    });
    if (!response.ok) return 0;
    const payload = await response.json();
    return parseApinexResetAt(payload?.resets_at_utc);
  } catch {
    return 0;
  }
}

export function resetApinexCachesForTests() {
  catalogPromise = null;
}
