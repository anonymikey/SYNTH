import { fetchGitHubJson, verifyGitHubRepositoryInstallation } from '../../../../../lib/github-app.js';
import { listImportableTreeEntries, safeGitHubBranch, safeGitHubRepoName } from '../../../../../lib/github-repo.js';
import { githubJson, publicIntegrationError, requireGitHubSession } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function validSha(value) { return /^[a-f0-9]{40}$/i.test(String(value || '')); }

export async function GET(request) {
  const auth = await requireGitHubSession(request);
  if (!auth.ok) return githubJson(publicIntegrationError(auth.state), auth.status);
  const params = new URL(request.url).searchParams;
  const installationId = Number(params.get('installation'));
  const repositoryPage = Number(params.get('repositoryPage') || '1');
  const repository = safeGitHubRepoName(params.get('repository'));
  const branch = safeGitHubBranch(params.get('branch'));
  if (!Number.isSafeInteger(installationId) || installationId < 1 || !auth.session.installations?.some((item) => Number(item.id) === installationId) || !repository || !branch
    || !Number.isSafeInteger(repositoryPage) || repositoryPage < 1 || repositoryPage > 50) {
    return githubJson({ error: 'invalid_repository', message: 'Choose a repository and branch from a connected GitHub installation.' }, 400);
  }
  const installationCheck = await verifyGitHubRepositoryInstallation(auth.session.accessToken, installationId, repository, repositoryPage);
  if (installationCheck !== 'allowed') return githubJson({ error: installationCheck === 'unavailable' ? 'github_request_failed' : 'invalid_repository', message: installationCheck === 'unavailable' ? 'Could not verify this repository with GitHub right now.' : 'Choose a repository attached to the selected GitHub installation.' }, installationCheck === 'unavailable' ? 502 : 403);
  const [owner, repo] = repository.split('/');
  const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git`;
  const ref = await fetchGitHubJson(auth.session.accessToken, `${prefix}/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`);
  if (!ref.ok || !validSha(ref.data?.object?.sha) || ref.data?.object?.type !== 'commit') {
    return githubJson({ error: 'branch_unavailable', message: 'That branch is no longer available. Refresh the branch list.' }, ref.status === 404 ? 404 : 502);
  }
  const baseCommitSha = ref.data.object.sha;
  const commit = await fetchGitHubJson(auth.session.accessToken, `${prefix}/commits/${baseCommitSha}`);
  const treeSha = commit.data?.tree?.sha;
  if (!commit.ok || !validSha(treeSha)) return githubJson({ error: 'repository_unavailable', message: 'Could not read the selected repository revision.' }, 502);
  const treeResponse = await fetchGitHubJson(auth.session.accessToken, `${prefix}/trees/${treeSha}?recursive=1`);
  if (!treeResponse.ok) return githubJson({ error: treeResponse.status === 429 ? 'github_rate_limited' : 'repository_unavailable', message: 'Could not read the selected repository files.' }, treeResponse.status === 429 ? 429 : 502);
  if (treeResponse.data?.truncated === true || !Array.isArray(treeResponse.data?.tree)) {
    return githubJson({ error: 'repository_tree_truncated', message: 'This repository tree is too large to import safely in one view.' }, 413);
  }
  const filtered = listImportableTreeEntries(treeResponse.data.tree);
  return githubJson({
    installation: installationId,
    repository,
    repositoryPage,
    branch,
    baseCommitSha,
    treeSha,
    files: filtered.files.map(({ path, size }) => ({ path, size })),
    filesCapped: filtered.capped,
    skippedCount: Math.min(10_000, filtered.skipped),
    safeFileCount: filtered.files.length,
  });
}
