import { fetchGitHubJson, verifyGitHubRepositoryInstallation } from '../../../../../lib/github-app.js';
import { safeGitHubBranch, safeGitHubRepoName } from '../../../../../lib/github-repo.js';
import { githubJson, publicIntegrationError, requireGitHubSession } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  const auth = await requireGitHubSession(request);
  if (!auth.ok) return githubJson(publicIntegrationError(auth.state), auth.status);
  const params = new URL(request.url).searchParams;
  const installationId = Number(params.get('installation'));
  const repositoryPage = Number(params.get('repositoryPage') || '1');
  const repository = safeGitHubRepoName(params.get('repository'));
  const page = Number(params.get('page') || '1');
  if (!Number.isSafeInteger(installationId) || installationId < 1 || !auth.session.installations?.some((item) => Number(item.id) === installationId) || !repository) {
    return githubJson({ error: 'invalid_repository', message: 'Choose a repository from a connected GitHub installation.' }, 400);
  }
  if (!Number.isSafeInteger(repositoryPage) || repositoryPage < 1 || repositoryPage > 50) return githubJson({ error: 'invalid_page', message: 'Choose a valid repository page.' }, 400);
  if (!Number.isSafeInteger(page) || page < 1 || page > 50) return githubJson({ error: 'invalid_page', message: 'Choose a valid branch page.' }, 400);
  const installationCheck = await verifyGitHubRepositoryInstallation(auth.session.accessToken, installationId, repository, repositoryPage);
  if (installationCheck !== 'allowed') return githubJson({ error: installationCheck === 'unavailable' ? 'github_request_failed' : 'invalid_repository', message: installationCheck === 'unavailable' ? 'Could not verify this repository with GitHub right now.' : 'Choose a repository attached to the selected GitHub installation.' }, installationCheck === 'unavailable' ? 502 : 403);
  const [owner, repo] = repository.split('/');
  const response = await fetchGitHubJson(auth.session.accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=100&page=${page}`);
  if (!response.ok) return githubJson({ error: response.status === 429 ? 'github_rate_limited' : 'github_request_failed', message: 'Could not load branches from GitHub right now.' }, response.status === 429 ? 429 : 502);
  const branches = (Array.isArray(response.data) ? response.data : []).map((item) => safeGitHubBranch(item?.name)).filter(Boolean);
  return githubJson({ installation: installationId, repository, page, branches, hasMore: page < 50 && branches.length === 100 });
}
