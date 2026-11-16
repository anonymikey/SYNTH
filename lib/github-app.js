import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import {
  claimTemp,
  delTemp,
  getTemp,
  persistent,
  putTemp,
  releaseTemp,
  takeTemp,
} from './db.js';

const PREFIX = 'synth:github:v1:';
const OAUTH_STATE_TTL = 600;
const IMPORT_SNAPSHOT_TTL = 21_600;
const MAX_SESSION_TTL = 15_552_000;
const STORAGE_TIMEOUT_MS = 2_000;
const SESSION_COOKIE = 'synth_github_session';
const STATE_COOKIE = 'synth_github_oauth_state';
const API_BASE = 'https://api.github.com';
const AUTH_BASE = 'https://github.com/login/oauth';
const API_VERSION = '2026-03-10';

function encryptionKey() {
  const value = process.env.GITHUB_SESSION_SECRET || '';
  return /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : null;
}

function validConfiguredUrl(value, requiredPath) {
  try {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && local && url.protocol === 'http:')) return '';
    if (url.username || url.password || url.search || url.hash || url.pathname !== requiredPath) return '';
    return url.toString().replace(/\/$/, '');
  } catch { return ''; }
}

export function getGitHubAppConfig() {
  const clientId = (process.env.GITHUB_APP_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GITHUB_APP_CLIENT_SECRET || '').trim();
  const slug = (process.env.GITHUB_APP_SLUG || '').trim();
  const callbackUrl = validConfiguredUrl(process.env.GITHUB_CALLBACK_URL || '', '/api/integrations/github/callback');
  const setupUrl = validConfiguredUrl(process.env.GITHUB_SETUP_URL || '', '/api/integrations/github/installed');
  if (!clientId || !clientSecret || !/^[A-Za-z0-9-]{1,100}$/.test(slug) || !callbackUrl || !setupUrl || !encryptionKey()
    || new URL(callbackUrl).origin !== new URL(setupUrl).origin) return null;
  return { clientId, clientSecret, slug, callbackUrl, setupUrl };
}

export function githubIntegrationConfigured() {
  return Boolean(persistent && getGitHubAppConfig());
}

export function encryptGitHubRecord(value) {
  const key = encryptionKey();
  if (!key) throw new Error('GitHub session encryption is unavailable.');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return { v: 1, iv: iv.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), data: ciphertext.toString('base64url') };
}

export function decryptGitHubRecord(record) {
  const key = encryptionKey();
  if (!key || !record || record.v !== 1 || typeof record.iv !== 'string' || typeof record.tag !== 'string' || typeof record.data !== 'string') return null;
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64url'));
    const json = Buffer.concat([decipher.update(Buffer.from(record.data, 'base64url')), decipher.final()]).toString('utf8');
    return JSON.parse(json);
  } catch { return null; }
}

export function hashGitHubOpaque(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export function createGitHubPkce() {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  return { state, verifier, challenge };
}

export function safeEqualState(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' || left.length !== right.length || !left.length || left.length > 128) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return timingSafeEqual(a, b);
}

export function readGitHubCookie(request, name = SESSION_COOKIE) {
  const header = request?.headers?.get?.('cookie') || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0 || part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    return /^[A-Za-z0-9_-]{40,100}$/.test(value) ? value : '';
  }
  return '';
}

function sessionKey(id) { return `${PREFIX}session:${hashGitHubOpaque(id)}`; }
function oauthKey(state) { return `${PREFIX}oauth:${hashGitHubOpaque(state)}`; }
function refreshLockKey(id) { return `${PREFIX}refresh:${hashGitHubOpaque(id)}`; }
function snapshotKey(id) { return `${PREFIX}snapshot:${hashGitHubOpaque(id)}`; }

export async function storeOAuthState(state, verifier, now = Date.now()) {
  const record = encryptGitHubRecord({ verifier, createdAt: now });
  await putTemp(oauthKey(state), record, OAUTH_STATE_TTL, { timeoutMs: STORAGE_TIMEOUT_MS });
}

export async function consumeOAuthState(state) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(state || ''))) return null;
  const record = await takeTemp(oauthKey(state), { timeoutMs: STORAGE_TIMEOUT_MS });
  const value = decryptGitHubRecord(record);
  if (!value || typeof value.verifier !== 'string' || Date.now() - Number(value.createdAt) > OAUTH_STATE_TTL * 1000) return null;
  return value;
}

export async function createGitHubSession(payload, now = Date.now()) {
  const id = randomBytes(32).toString('base64url');
  await saveGitHubSession(id, payload, now);
  return id;
}

export async function saveGitHubSession(id, payload, now = Date.now()) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) throw new Error('Invalid session identifier.');
  const value = { ...payload, updatedAt: now };
  const encrypted = encryptGitHubRecord(value);
  const tokenExpiry = Number(value.refreshExpiresAt) || now + MAX_SESSION_TTL * 1000;
  const ttl = Math.max(60, Math.min(MAX_SESSION_TTL, Math.ceil((tokenExpiry - now) / 1000)));
  await putTemp(sessionKey(id), encrypted, ttl, { timeoutMs: STORAGE_TIMEOUT_MS });
}

export async function loadGitHubSession(id) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) return null;
  const record = await getTemp(sessionKey(id), { timeoutMs: STORAGE_TIMEOUT_MS });
  const value = decryptGitHubRecord(record);
  if (!value || typeof value.accessToken !== 'string' || typeof value.refreshToken !== 'string' || !Number.isSafeInteger(Number(value.user?.id))) return null;
  return value;
}

export async function deleteGitHubSession(id) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) return false;
  await delTemp(sessionKey(id), { timeoutMs: STORAGE_TIMEOUT_MS });
  return true;
}

export async function createGitHubImportSnapshot(payload) {
  const id = randomBytes(32).toString('base64url');
  await putTemp(snapshotKey(id), encryptGitHubRecord(payload), IMPORT_SNAPSHOT_TTL, { timeoutMs: STORAGE_TIMEOUT_MS });
  return id;
}

export async function loadGitHubImportSnapshot(id) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) return null;
  const value = decryptGitHubRecord(await getTemp(snapshotKey(id), { timeoutMs: STORAGE_TIMEOUT_MS }));
  if (!value || !Number.isSafeInteger(Number(value.userId)) || !Number.isSafeInteger(Number(value.installationId))
    || typeof value.repository !== 'string' || !Number.isSafeInteger(Number(value.repositoryPage)) || Number(value.repositoryPage) < 1 || Number(value.repositoryPage) > 50
    || typeof value.branch !== 'string' || !/^[a-f0-9]{40}$/i.test(String(value.baseCommitSha || ''))
    || !value.baseShas || typeof value.baseShas !== 'object' || Array.isArray(value.baseShas)) return null;
  return value;
}

export async function saveGitHubImportSnapshot(id, payload) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) throw new Error('Invalid import snapshot identifier.');
  await putTemp(snapshotKey(id), encryptGitHubRecord(payload), IMPORT_SNAPSHOT_TTL, { timeoutMs: STORAGE_TIMEOUT_MS });
}

export async function deleteGitHubImportSnapshot(id) {
  if (!/^[A-Za-z0-9_-]{40,100}$/.test(String(id || ''))) return false;
  await delTemp(snapshotKey(id), { timeoutMs: STORAGE_TIMEOUT_MS });
  return true;
}

export function sessionCookie(id, maxAge = MAX_SESSION_TTL) {
  return `${SESSION_COOKIE}=${id}; Path=/api/integrations/github; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/api/integrations/github; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function stateCookie(state, maxAge = OAUTH_STATE_TTL) {
  return `${STATE_COOKIE}=${state}; Path=/api/integrations/github/callback; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/api/integrations/github/callback; Max-Age=0; HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export async function buildGitHubAuthorizeUrl({ state, challenge }) {
  const config = getGitHubAppConfig();
  if (!config) return '';
  const url = new URL(`${AUTH_BASE}/authorize`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callbackUrl);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('scope', 'offline_access');
  return url.toString();
}

async function oauthTokenRequest(parameters) {
  const config = getGitHubAppConfig();
  if (!config) return { ok: false, status: 503, tokens: null };
  try {
    const response = await fetch(`${AUTH_BASE}/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...parameters }),
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.error || typeof body.access_token !== 'string' || !body.access_token.startsWith('ghu_') || typeof body.refresh_token !== 'string' || !body.refresh_token.startsWith('ghr_') || !Number.isFinite(Number(body.expires_in)) || !Number.isFinite(Number(body.refresh_token_expires_in))) {
      return { ok: false, status: response.status, tokens: null };
    }
    return { ok: true, status: response.status, tokens: body };
  } catch { return { ok: false, status: 0, tokens: null }; }
}

export async function exchangeGitHubCode(code, verifier) {
  const config = getGitHubAppConfig();
  if (!config || typeof code !== 'string' || code.length > 500 || typeof verifier !== 'string' || verifier.length < 43 || verifier.length > 128) return { ok: false, status: 400, tokens: null };
  return oauthTokenRequest({ code, redirect_uri: config.callbackUrl, code_verifier: verifier });
}

export async function refreshGitHubToken(refreshToken) {
  if (typeof refreshToken !== 'string' || !refreshToken.startsWith('ghr_') || refreshToken.length > 1000) return { ok: false, status: 400, tokens: null };
  return oauthTokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken });
}

export async function fetchGitHubJson(accessToken, path, { method = 'GET', body, timeoutMs = 10_000 } = {}) {
  if (typeof accessToken !== 'string' || !accessToken.startsWith('ghu_') || accessToken.length > 1000 || typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('#')) return { ok: false, status: 400, data: null };
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${accessToken}`,
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': 'SYNTH-GitHub-App',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error',
    });
    if (response.status === 204) return { ok: response.ok, status: response.status, data: null };
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > 4_000_000) {
      try { await response.body?.cancel(); } catch {}
      return { ok: false, status: 413, data: null };
    }
    const reader = response.body?.getReader?.();
    if (!reader) return { ok: false, status: response.status, data: null };
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) {
        try { await reader.cancel(); } catch {}
        return { ok: false, status: 413, data: null };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let data = null;
    try { data = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); } catch {}
    return { ok: response.ok, status: response.status, data };
  } catch { return { ok: false, status: 0, data: null }; }
}

export async function loadGitHubUser(accessToken) {
  const result = await fetchGitHubJson(accessToken, '/user');
  const id = Number(result.data?.id);
  const login = String(result.data?.login || '');
  if (!result.ok || !Number.isSafeInteger(id) || id < 1 || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return null;
  return { id, login };
}

export function normalizeGitHubInstallations(data) {
  const rows = Array.isArray(data?.installations) ? data.installations : [];
  return rows.filter((entry) => Number.isSafeInteger(Number(entry?.id)) && Number(entry.id) > 0)
    .map((entry) => ({
      id: Number(entry.id),
      account: String(entry.account?.login || '').slice(0, 100),
      accountType: ['User', 'Organization', 'Enterprise'].includes(entry.target_type) ? entry.target_type : 'Account',
      repositorySelection: entry.repository_selection === 'all' ? 'all' : 'selected',
    }));
}

export async function fetchGitHubInstallations(accessToken) {
  const results = [];
  for (let page = 1; page <= 20; page++) {
    const response = await fetchGitHubJson(accessToken, `/user/installations?per_page=100&page=${page}`);
    if (!response.ok) return null;
    const batch = normalizeGitHubInstallations(response.data);
    results.push(...batch);
    const total = Number(response.data?.total_count);
    if ((Number.isFinite(total) && results.length >= total) || batch.length < 100) return results;
  }
  return null;
}

export async function verifyGitHubRepositoryInstallation(accessToken, installationId, repository, repositoryPage = 1) {
  if (!Number.isSafeInteger(Number(installationId)) || Number(installationId) < 1
    || typeof repository !== 'string' || !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(repository)
    || repository.split('/').some((part) => part === '.' || part === '..')
    || !Number.isSafeInteger(Number(repositoryPage)) || Number(repositoryPage) < 1 || Number(repositoryPage) > 50) return 'forbidden';
  const result = await fetchGitHubJson(accessToken, `/user/installations/${Number(installationId)}/repositories?per_page=100&page=${Number(repositoryPage)}`);
  if (!result.ok) {
    if (result.status === 404) return 'forbidden';
    return 'unavailable';
  }
  if (!Array.isArray(result.data?.repositories)) return 'unavailable';
  if (result.data.repositories.some((item) => String(item?.full_name || '').toLowerCase() === repository.toLowerCase())) return 'allowed';
  if (result.status === 200) return 'forbidden';
  return 'unavailable';
}

function validSessionPayload(value) {
  return value && typeof value.accessToken === 'string' && value.accessToken.startsWith('ghu_')
    && typeof value.refreshToken === 'string' && value.refreshToken.startsWith('ghr_')
    && Number.isFinite(Number(value.accessExpiresAt)) && Number.isFinite(Number(value.refreshExpiresAt))
    && Number.isSafeInteger(Number(value.user?.id)) && /^[A-Za-z0-9-]{1,39}$/.test(String(value.user?.login || ''));
}

export async function resolveGitHubSession(id, now = Date.now()) {
  if (!persistent || !getGitHubAppConfig()) return { state: 'unavailable', session: null };
  let session;
  try { session = await loadGitHubSession(id); } catch { return { state: 'unavailable', session: null }; }
  if (!validSessionPayload(session)) return { state: 'disconnected', session: null };
  if (Number(session.accessExpiresAt) > now + 90_000) return { state: 'connected', session };
  if (Number(session.refreshExpiresAt) <= now + 5_000) {
    try { await deleteGitHubSession(id); } catch {}
    return { state: 'expired', session: null };
  }

  const lockKey = refreshLockKey(id);
  const owner = randomBytes(18).toString('base64url');
  let claimed = false;
  try { claimed = await claimTemp(lockKey, owner, 18, { timeoutMs: STORAGE_TIMEOUT_MS }); }
  catch { return { state: 'unavailable', session: null }; }
  if (!claimed) {
    for (const delay of [120, 250, 450]) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        const latest = await loadGitHubSession(id);
        if (validSessionPayload(latest) && Number(latest.accessExpiresAt) > Date.now() + 90_000) return { state: 'connected', session: latest };
      } catch { return { state: 'unavailable', session: null }; }
    }
    return { state: 'unavailable', session: null };
  }

  try {
    const latest = await loadGitHubSession(id);
    if (!validSessionPayload(latest)) return { state: 'disconnected', session: null };
    if (Number(latest.accessExpiresAt) > Date.now() + 90_000) return { state: 'connected', session: latest };
    const refreshed = await refreshGitHubToken(latest.refreshToken);
    if (!refreshed.ok) {
      if (refreshed.status >= 400 && refreshed.status < 500 && refreshed.status !== 429) {
        try { await deleteGitHubSession(id); } catch {}
        return { state: 'expired', session: null };
      }
      return { state: 'unavailable', session: null };
    }
    const tokens = refreshed.tokens;
    const updated = {
      ...latest,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      accessExpiresAt: Date.now() + Number(tokens.expires_in) * 1000,
      refreshExpiresAt: Date.now() + Number(tokens.refresh_token_expires_in) * 1000,
    };
    await saveGitHubSession(id, updated);
    return { state: 'connected', session: updated };
  } catch { return { state: 'unavailable', session: null }; }
  finally { try { await releaseTemp(lockKey, owner, { timeoutMs: STORAGE_TIMEOUT_MS }); } catch {} }
}

export async function revokeGitHubGrant(accessToken) {
  const config = getGitHubAppConfig();
  if (!config || typeof accessToken !== 'string' || !accessToken.startsWith('ghu_')) return false;
  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(config.clientId)}/grant`, {
      method: 'DELETE',
      headers: { Accept: 'application/vnd.github+json', Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', 'X-GitHub-Api-Version': API_VERSION },
      body: JSON.stringify({ access_token: accessToken }),
      signal: AbortSignal.timeout(8_000),
      redirect: 'error',
    });
    return response.status === 204;
  } catch { return false; }
}

export async function installationReturnUrl(result) {
  const config = getGitHubAppConfig();
  if (!config) return '/app';
  const url = new URL('/app', config.callbackUrl);
  url.searchParams.set('integration', result);
  return url.toString();
}

export const GITHUB_SESSION_COOKIE = SESSION_COOKIE;
export const GITHUB_STATE_COOKIE = STATE_COOKIE;
export const GITHUB_OAUTH_TTL_SECONDS = OAUTH_STATE_TTL;
