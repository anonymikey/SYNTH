import { persistent } from './db.js';
import { readGitHubCookie, resolveGitHubSession } from './github-app.js';

export function githubJson(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...extraHeaders,
    },
  });
}

export function hasSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function readBoundedGitHubJson(request, maxBytes = 64_000) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const reader = request.body?.getReader?.();
  if (!reader) return null;
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    try { await reader.cancel(); } catch {}
    return null;
  }
}

export async function requireGitHubSession(request) {
  if (!persistent) return { ok: false, state: 'unavailable', status: 503 };
  const id = readGitHubCookie(request);
  if (!id) return { ok: false, state: 'disconnected', status: 401 };
  try {
    const resolved = await resolveGitHubSession(id);
    if (resolved.state === 'connected') return { ok: true, id, session: resolved.session };
    return { ok: false, state: resolved.state, status: resolved.state === 'disconnected' ? 401 : resolved.state === 'expired' ? 401 : 503 };
  } catch { return { ok: false, state: 'unavailable', status: 503 }; }
}

export function publicIntegrationError(state = 'unavailable') {
  if (state === 'disconnected' || state === 'expired') return { error: 'github_not_connected', message: 'Connect GitHub again to continue.' };
  return { error: 'integration_unavailable', message: 'GitHub integration is temporarily unavailable.' };
}

export function safeUiReturnUrl(callbackUrl, value) {
  try {
    const url = new URL('/app', callbackUrl);
    if (['connected', 'installed', 'cancelled', 'expired', 'unavailable', 'invalid'].includes(value)) url.searchParams.set('integration', value);
    return url.toString();
  } catch { return '/app'; }
}
