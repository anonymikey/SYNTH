import { githubIntegrationConfigured, getGitHubAppConfig, readGitHubCookie, resolveGitHubSession } from '../../../../../lib/github-app.js';
import { githubJson } from '../../../../../lib/github-route.js';
import { persistent } from '../../../../../lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const configured = githubIntegrationConfigured();
  const storageReady = Boolean(persistent);
  if (!configured) return githubJson({ configured: false, storageReady, connected: false, account: null, installations: [] });
  const id = readGitHubCookie(request);
  if (!id) return githubJson({ configured: true, storageReady: true, connected: false, account: null, installations: [] });
  try {
    const resolved = await resolveGitHubSession(id);
    if (resolved.state !== 'connected') {
      return githubJson({ configured: true, storageReady: true, connected: false, state: resolved.state, account: null, installations: [] }, resolved.state === 'unavailable' ? 503 : 200);
    }
    const session = resolved.session;
    const config = getGitHubAppConfig();
    return githubJson({
      configured: true,
      storageReady: true,
      connected: true,
      account: { login: session.user.login },
      installations: Array.isArray(session.installations) ? session.installations.map((item) => ({
        id: Number(item.id),
        account: String(item.account || '').slice(0, 100),
        accountType: ['User', 'Organization', 'Enterprise'].includes(item.accountType) ? item.accountType : 'Account',
        repositorySelection: item.repositorySelection === 'all' ? 'all' : 'selected',
      })) : [],
      installUrl: `https://github.com/apps/${encodeURIComponent(config.slug)}/installations/new`,
    });
  } catch { return githubJson({ error: 'integration_unavailable', message: 'GitHub integration is temporarily unavailable.' }, 503); }
}
