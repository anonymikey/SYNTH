// UnoRouter is an optional server-side fallback. Keep its host fixed and model IDs free-only.
const BASE_URL = 'https://api.unorouter.com/v1';
const DEFAULT_FREE_MODELS = ['deepseek/deepseek-v4.1-flash-1017:free', 'openai/gpt-oss-120b:free'];
const MAX_MODELS = 4;
const MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1000;
const FREE_MODEL_ID = /^[a-z0-9][a-z0-9._-]{0,63}(?:\/[a-z0-9][a-z0-9._-]{0,63})?:free$/i;

const cleanSecret = (value) => String(value || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();

export const unorouterBase = () => BASE_URL;
export const unorouterKey = () => cleanSecret(process.env.UNOROUTER_API_KEY);
export const isUnoFreeModelId = (value) => typeof value === 'string' && FREE_MODEL_ID.test(value.trim());

export function unorouterFreeModels() {
  const raw = String(process.env.UNOROUTER_FREE_MODELS || '').trim();
  const candidates = raw ? raw.split(/[\s,]+/).filter(Boolean) : DEFAULT_FREE_MODELS;
  return [...new Set(candidates.map((value) => value.trim()).filter(isUnoFreeModelId))].slice(0, MAX_MODELS);
}

export function unorouterModelConfigNote() {
  const raw = String(process.env.UNOROUTER_FREE_MODELS || '').trim();
  if (!raw) return '';
  const configured = raw.split(/[\s,]+/).filter(Boolean);
  return configured.some((model) => !isUnoFreeModelId(model))
    ? 'UnoRouter ignored invalid model entries; only model IDs ending exactly in :free can be used.'
    : '';
}

export function unorouterProblem() {
  if (!unorouterKey()) return 'UnoRouter is enabled but its server API key is not configured.';
  if (!unorouterFreeModels().length) return 'UnoRouter is enabled but no valid :free model IDs are configured.';
  if (!String(process.env.UPSTASH_REDIS_REST_URL || '').trim() || !String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()) return 'UnoRouter needs connected shared workspace storage to enforce its free-model request limits safely.';
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
