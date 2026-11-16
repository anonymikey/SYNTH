import { createGitHubImportSnapshot, fetchGitHubJson, verifyGitHubRepositoryInstallation } from '../../../../../lib/github-app.js';
import { decodeGitHubTextBlob, listImportableTreeEntries, safeGitHubBranch, safeGitHubRepoName, validateGitHubImportSelection } from '../../../../../lib/github-repo.js';
import { githubJson, hasSameOrigin, publicIntegrationError, readBoundedGitHubJson, requireGitHubSession } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

function validSha(value) { return /^[a-f0-9]{40}$/i.test(String(value || '')); }

async function mapLimit(items, limit, callback) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await callback(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return githubJson({ error: 'same_origin_required', message: 'Refresh SYNTH and try again.' }, 403);
  const auth = await requireGitHubSession(request);
  if (!auth.ok) return githubJson(publicIntegrationError(auth.state), auth.status);
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return githubJson({ error: 'invalid_content_type', message: 'Send the selected files as JSON.' }, 415);
  const body = await readBoundedGitHubJson(request, 64_000);
  const installationId = Number(body?.installation);
  const repositoryPage = Number(body?.repositoryPage);
  const repository = safeGitHubRepoName(body?.repository);
  const branch = safeGitHubBranch(body?.branch);
  const baseCommitSha = String(body?.baseCommitSha || '');
  const paths = body?.paths;
  if (!Number.isSafeInteger(installationId) || installationId < 1 || !auth.session.installations?.some((item) => Number(item.id) === installationId)
    || !Number.isSafeInteger(repositoryPage) || repositoryPage < 1 || repositoryPage > 50
    || !repository || !branch || !validSha(baseCommitSha) || !Array.isArray(paths)) {
    return githubJson({ error: 'invalid_import', message: 'Choose valid repository files and try again.' }, 400);
  }
  const installationCheck = await verifyGitHubRepositoryInstallation(auth.session.accessToken, installationId, repository, repositoryPage);
  if (installationCheck !== 'allowed') return githubJson({ error: installationCheck === 'unavailable' ? 'github_request_failed' : 'invalid_repository', message: installationCheck === 'unavailable' ? 'Could not verify this repository with GitHub right now.' : 'Choose a repository attached to the selected GitHub installation.' }, installationCheck === 'unavailable' ? 502 : 403);
  const [owner, repo] = repository.split('/');
  const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git`;
  const ref = await fetchGitHubJson(auth.session.accessToken, `${prefix}/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`);
  if (!ref.ok || ref.data?.object?.type !== 'commit' || !validSha(ref.data?.object?.sha)) return githubJson({ error: 'branch_unavailable', message: 'That branch is no longer available. Refresh the branch list.' }, 409);
  if (ref.data.object.sha !== baseCommitSha) return githubJson({ error: 'branch_changed', message: 'The branch changed since you selected these files. Refresh the file list before importing.' }, 409);
  const commit = await fetchGitHubJson(auth.session.accessToken, `${prefix}/commits/${baseCommitSha}`);
  const treeSha = commit.data?.tree?.sha;
  if (!commit.ok || !validSha(treeSha)) return githubJson({ error: 'repository_unavailable', message: 'Could not verify the selected repository revision.' }, 502);
  const treeResponse = await fetchGitHubJson(auth.session.accessToken, `${prefix}/trees/${treeSha}?recursive=1`);
  if (!treeResponse.ok) return githubJson({ error: treeResponse.status === 429 ? 'github_rate_limited' : 'repository_unavailable', message: 'Could not load the selected repository files.' }, treeResponse.status === 429 ? 429 : 502);
  if (treeResponse.data?.truncated === true || !Array.isArray(treeResponse.data?.tree)) return githubJson({ error: 'repository_tree_truncated', message: 'This repository tree is too large to import safely in one view.' }, 413);
  const tree = listImportableTreeEntries(treeResponse.data.tree);
  const selected = validateGitHubImportSelection(paths, tree.files);
  if (!selected.ok) return githubJson({ error: 'invalid_selection', message: 'One or more selected files are unavailable or exceed the import limits.' }, 400);

  const downloaded = await mapLimit(selected.files, 8, async (file) => {
    const response = await fetchGitHubJson(auth.session.accessToken, `${prefix}/blobs/${encodeURIComponent(file.sha)}`, { timeoutMs: 8_000 });
    if (!response.ok) return null;
    const content = decodeGitHubTextBlob(response.data, file.path);
    if (content === null || new TextEncoder().encode(content).byteLength !== file.size) return null;
    return { path: file.path, content, sha: file.sha, size: file.size, mode: file.mode };
  });
  if (downloaded.some((file) => file === null)) return githubJson({ error: 'unsafe_file_content', message: 'One or more selected files could not be imported as safe UTF-8 text.' }, 422);
  const originalFiles = Object.fromEntries(downloaded.map((file) => [file.path, file.content]));
  const baseShas = Object.fromEntries(downloaded.map((file) => [file.path, file.sha]));
  const baseModes = Object.fromEntries(downloaded.map((file) => [file.path, file.mode]));
  let snapshotId;
  try {
    snapshotId = await createGitHubImportSnapshot({
      userId: Number(auth.session.user.id), installationId, repository, repositoryPage, branch, baseCommitSha, treeSha, baseShas,
      baseModes,
    });
  } catch { return githubJson({ error: 'import_snapshot_unavailable', message: 'The secure repository snapshot could not be saved. Try importing again.' }, 503); }
  return githubJson({ repository, repositoryPage, branch, installation: installationId, baseCommitSha, treeSha, snapshotId, files: downloaded, originalFiles, totalBytes: selected.totalBytes });
}
