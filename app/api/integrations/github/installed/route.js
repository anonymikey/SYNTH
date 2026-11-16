import {
  fetchGitHubInstallations,
  readGitHubCookie,
  resolveGitHubSession,
  saveGitHubSession,
} from '../../../../../lib/github-app.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function redirect(location) {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function GET(request) {
  const sessionId = readGitHubCookie(request);
  if (!sessionId) return redirect('/app?integration=invalid');
  const url = new URL(request.url);
  const action = url.searchParams.get('setup_action');
  const id = Number(url.searchParams.get('installation_id'));
  if (!['install', 'update'].includes(action) || !Number.isSafeInteger(id) || id < 1) return redirect('/app?integration=cancelled');
  let resolved;
  try { resolved = await resolveGitHubSession(sessionId); } catch { return redirect('/app?integration=unavailable'); }
  if (resolved.state !== 'connected') return redirect(`/app?integration=${resolved.state === 'expired' ? 'expired' : 'invalid'}`);

  const installations = await fetchGitHubInstallations(resolved.session.accessToken);
  if (!installations) return redirect('/app?integration=unavailable');
  if (!installations.some((item) => item.id === id)) return redirect('/app?integration=invalid');
  try {
    await saveGitHubSession(sessionId, { ...resolved.session, installations });
    return redirect('/app?integration=installed');
  } catch { return redirect('/app?integration=unavailable'); }
}
