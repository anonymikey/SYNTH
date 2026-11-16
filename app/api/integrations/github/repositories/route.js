import { fetchGitHubJson } from '../../../../../lib/github-app.js';
import { safeGitHubBranch, safeGitHubRepoName } from '../../../../../lib/github-repo.js';
import { githubJson, publicIntegrationError, requireGitHubSession } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const auth = await requireGitHubSession(request);
  if (!auth.ok) return githubJson(publicIntegrationError(auth.state), auth.status);
  const params = new URL(request.url).searchParams;
  const installationId = Number(params.get('installation'));
  const page = Number(params.get('page') || '1');
  if (!Number.isSafeInteger(installationId) || installationId < 1 || !auth.session.installations?.some((item) => Number(item.id) === installationId)) {
    return githubJson({ error: 'invalid_installation', message: 'Choose a GitHub installation connected to this account.' }, 400);
  }
  if (!Number.isSafeInteger(page) || page < 1 || page > 50) return githubJson({ error: 'invalid_page', message: 'Choose a valid repository page.' }, 400);

  const response = await fetchGitHubJson(auth.session.accessToken, `/user/installations/${installationId}/repositories?per_page=100&page=${page}`);
  if (!response.ok) return githubJson({ error: response.status === 429 ? 'github_rate_limited' : 'github_request_failed', message: 'Could not load repositories from GitHub right now.' }, response.status === 429 ? 429 : 502);
  const rows = Array.isArray(response.data?.repositories) ? response.data.repositories : [];
  const repositories = rows.map((repo) => {
    const fullName = safeGitHubRepoName(repo?.full_name);
    const defaultBranch = safeGitHubBranch(repo?.default_branch);
    if (!fullName || !defaultBranch) return null;
    return {
      fullName,
      repositoryPage: page,
      name: String(repo.name || fullName.split('/').pop()).slice(0, 100),
      owner: fullName.split('/')[0],
      private: Boolean(repo.private),
      defaultBranch,
      visibility: ['public', 'private', 'internal'].includes(repo.visibility) ? repo.visibility : (repo.private ? 'private' : 'public'),
    };
  }).filter(Boolean);
  return githubJson({
    installation: installationId,
    page,
    total: Math.max(0, Math.min(100_000, Number(response.data?.total_count) || repositories.length)),
    hasMore: page < 50 && repositories.length === 100,
    repositories,
  });
}
