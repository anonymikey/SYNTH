import { clearSessionCookie, deleteGitHubSession, loadGitHubSession, readGitHubCookie, revokeGitHubGrant } from '../../../../../lib/github-app.js';
import { githubJson, hasSameOrigin } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  if (!hasSameOrigin(request)) return githubJson({ error: 'same_origin_required', message: 'Refresh SYNTH and try again.' }, 403);
  const id = readGitHubCookie(request);
  if (!id) return githubJson({ ok: true, revoked: false }, 200, { 'Set-Cookie': clearSessionCookie() });
  try {
    const session = await loadGitHubSession(id);
    const revoked = session?.accessToken ? await revokeGitHubGrant(session.accessToken) : false;
    await deleteGitHubSession(id);
    return githubJson({ ok: true, revoked }, 200, { 'Set-Cookie': clearSessionCookie() });
  } catch { return githubJson({ error: 'disconnect_unavailable', message: 'Could not safely clear this connection yet. Try again.' }, 503); }
}
