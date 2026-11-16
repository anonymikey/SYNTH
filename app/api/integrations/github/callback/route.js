import {
  clearStateCookie,
  consumeOAuthState,
  createGitHubSession,
  exchangeGitHubCode,
  fetchGitHubInstallations,
  getGitHubAppConfig,
  loadGitHubUser,
  readGitHubCookie,
  revokeGitHubGrant,
  safeEqualState,
  sessionCookie,
  GITHUB_STATE_COOKIE,
} from '../../../../../lib/github-app.js';
import { safeUiReturnUrl } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  for (const cookie of cookies) if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

function returnTo(config, state, cookies = [clearStateCookie()]) {
  const location = config ? safeUiReturnUrl(config.callbackUrl, state)
    : `/app?integration=${['connected', 'installed', 'cancelled', 'expired', 'unavailable', 'invalid'].includes(state) ? state : 'unavailable'}`;
  return redirect(location, cookies);
}

export async function GET(request) {
  const config = getGitHubAppConfig();
  const url = new URL(request.url);
  const state = url.searchParams.get('state') || '';
  const cookieState = readGitHubCookie(request, GITHUB_STATE_COOKIE);
  if (!config) return returnTo(null, 'unavailable');
  if (!safeEqualState(state, cookieState)) return returnTo(config, 'invalid');
  let saved;
  try { saved = await consumeOAuthState(state); } catch { return returnTo(config, 'unavailable'); }
  if (!saved) return returnTo(config, 'invalid');
  if (url.searchParams.has('error')) return returnTo(config, 'cancelled');

  const code = url.searchParams.get('code') || '';
  if (!code) return returnTo(config, 'invalid');
  const exchanged = await exchangeGitHubCode(code, saved.verifier);
  if (!exchanged.ok) return returnTo(config, 'unavailable');
  const tokens = exchanged.tokens;
  const user = await loadGitHubUser(tokens.access_token);
  const installations = await fetchGitHubInstallations(tokens.access_token);
  if (!user || !installations) {
    await revokeGitHubGrant(tokens.access_token);
    return returnTo(config, 'unavailable');
  }

  const now = Date.now();
  const session = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    accessExpiresAt: now + Number(tokens.expires_in) * 1000,
    refreshExpiresAt: now + Number(tokens.refresh_token_expires_in) * 1000,
    user,
    installations,
  };
  try {
    const id = await createGitHubSession(session, now);
    return returnTo(config, 'connected', [clearStateCookie(), sessionCookie(id)]);
  } catch {
    await revokeGitHubGrant(tokens.access_token);
    return returnTo(config, 'unavailable');
  }
}
