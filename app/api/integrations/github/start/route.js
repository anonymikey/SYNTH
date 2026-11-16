import { buildGitHubAuthorizeUrl, createGitHubPkce, githubIntegrationConfigured, stateCookie, storeOAuthState } from '../../../../../lib/github-app.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function redirect(location, cookie = '') {
  const headers = new Headers({ Location: location, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 302, headers });
}

export async function GET() {
  if (!githubIntegrationConfigured()) return redirect('/app?integration=unavailable');
  const { state, verifier, challenge } = createGitHubPkce();
  try {
    await storeOAuthState(state, verifier);
    const authorizeUrl = await buildGitHubAuthorizeUrl({ state, challenge });
    if (!authorizeUrl) return redirect('/app?integration=unavailable');
    return redirect(authorizeUrl, stateCookie(state));
  } catch { return redirect('/app?integration=unavailable'); }
}
