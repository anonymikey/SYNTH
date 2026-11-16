import { randomBytes } from 'node:crypto';
import { claimTemp, releaseTemp } from '../../../../../lib/db.js';
import { fetchGitHubJson, hashGitHubOpaque, loadGitHubImportSnapshot, saveGitHubImportSnapshot, verifyGitHubRepositoryInstallation } from '../../../../../lib/github-app.js';
import { safeFilePath } from '../../../../../lib/files.js';
import { isExcludedGitHubPath, safeGitHubBranch, safeGitHubRepoName, validateGitHubChanges } from '../../../../../lib/github-repo.js';
import { githubJson, hasSameOrigin, publicIntegrationError, readBoundedGitHubJson, requireGitHubSession } from '../../../../../lib/github-route.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

function validSha(value) { return /^[a-f0-9]{40}$/i.test(String(value || '')); }
function messageText(value, limit) { return typeof value === 'string' ? value.replace(/\0/g, '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit) : ''; }
function validSnapshot(id, snapshot, auth, installation, repositoryPage, repository, branch, baseCommitSha) {
  if (!snapshot || Number(snapshot.userId) !== Number(auth.session.user.id) || Number(snapshot.installationId) !== installation
    || Number(snapshot.repositoryPage) !== repositoryPage
    || snapshot.repository !== repository || snapshot.branch !== branch || snapshot.baseCommitSha !== baseCommitSha
    || !snapshot.baseShas || typeof snapshot.baseShas !== 'object' || Array.isArray(snapshot.baseShas)) return false;
  const entries = Object.entries(snapshot.baseShas);
  if (entries.length > 50) return false;
  return entries.every(([path, sha]) => safeFilePath(path) && !isExcludedGitHubPath(path) && validSha(sha));
}

export async function POST(request) {
  if (!hasSameOrigin(request)) return githubJson({ error: 'same_origin_required', message: 'Refresh SYNTH and try again.' }, 403);
  const auth = await requireGitHubSession(request);
  if (!auth.ok) return githubJson(publicIntegrationError(auth.state), auth.status);
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return githubJson({ error: 'invalid_content_type', message: 'Send the reviewed changes as JSON.' }, 415);
  const body = await readBoundedGitHubJson(request, 2_500_000);
  const installation = Number(body?.installation);
  const repositoryPage = Number(body?.repositoryPage);
  const repository = safeGitHubRepoName(body?.repository);
  const branch = safeGitHubBranch(body?.branch);
  const baseCommitSha = String(body?.baseCommitSha || '');
  const snapshotId = String(body?.snapshotId || '');
  if (!Number.isSafeInteger(installation) || installation < 1 || !auth.session.installations?.some((item) => Number(item.id) === installation)
    || !Number.isSafeInteger(repositoryPage) || repositoryPage < 1 || repositoryPage > 50
    || !repository || !branch || !validSha(baseCommitSha) || !/^[A-Za-z0-9_-]{40,100}$/.test(snapshotId)) {
    return githubJson({ error: 'invalid_request', message: 'Choose a current imported repository and review its changes again.' }, 400);
  }
  const installationCheck = await verifyGitHubRepositoryInstallation(auth.session.accessToken, installation, repository, repositoryPage);
  if (installationCheck !== 'allowed') return githubJson({ error: installationCheck === 'unavailable' ? 'github_request_failed' : 'invalid_repository', message: installationCheck === 'unavailable' ? 'Could not verify this repository with GitHub right now.' : 'Choose a repository attached to the selected GitHub installation.' }, installationCheck === 'unavailable' ? 502 : 403);

  let snapshot;
  try { snapshot = await loadGitHubImportSnapshot(snapshotId); }
  catch { return githubJson({ error: 'integration_unavailable', message: 'The secure repository snapshot is temporarily unavailable.' }, 503); }
  if (!validSnapshot(snapshotId, snapshot, auth, installation, repositoryPage, repository, branch, baseCommitSha)) {
    return githubJson({ error: 'snapshot_expired', message: 'Re-import the repository before creating a pull request.' }, 409);
  }
  if (snapshot.submittedPullRequest) return githubJson({ error: 'already_published', message: 'A pull request was already created for this import. Re-import before submitting another.', pullRequest: snapshot.submittedPullRequest }, 409);

  const originalFiles = Object.fromEntries(Object.keys(snapshot.baseShas).map((path) => [path, '']));
  const validated = validateGitHubChanges(body?.changes, originalFiles);
  if (!validated.ok) return githubJson({ error: 'invalid_changes', message: 'The reviewed change set is invalid or exceeds safe size limits.' }, 400);
  const lockKey = `synth:github:pr-create:${hashGitHubOpaque(`${snapshotId}:${auth.session.user.id}`)}`;
  const lockOwner = randomBytes(18).toString('base64url');
  let locked = false;
  try { locked = await claimTemp(lockKey, lockOwner, 180, { timeoutMs: 2_000 }); }
  catch { return githubJson({ error: 'integration_unavailable', message: 'Could not safely reserve this pull-request action. Try again.' }, 503); }
  if (!locked) return githubJson({ error: 'submission_in_progress', message: 'A pull request is already being created for this import.' }, 409);

  let keepLock = false;
  try {
    const [owner, repo] = repository.split('/');
    const prefix = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git`;
    const ref = await fetchGitHubJson(auth.session.accessToken, `${prefix}/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`);
    const currentBase = ref.data?.object?.sha;
    if (!ref.ok || ref.data?.object?.type !== 'commit' || !validSha(currentBase)) return githubJson({ error: 'branch_unavailable', message: 'The base branch is no longer available. Refresh the repository.' }, 409);
    const baseCommit = await fetchGitHubJson(auth.session.accessToken, `${prefix}/commits/${currentBase}`);
    const currentTreeSha = baseCommit.data?.tree?.sha;
    if (!baseCommit.ok || !validSha(currentTreeSha)) return githubJson({ error: 'repository_unavailable', message: 'Could not verify the current base branch.' }, 502);
    const currentTree = await fetchGitHubJson(auth.session.accessToken, `${prefix}/trees/${currentTreeSha}?recursive=1`);
    if (!currentTree.ok || !Array.isArray(currentTree.data?.tree)) return githubJson({ error: 'repository_unavailable', message: 'Could not check for repository conflicts.' }, currentTree.status === 429 ? 429 : 502);
    if (currentTree.data.truncated === true) return githubJson({ error: 'repository_tree_truncated', message: 'This repository changed too much to verify safely. Re-import before publishing.' }, 413);
    const latestPaths = new Map(currentTree.data.tree.map((entry) => [entry.path, entry]));
    const conflicts = [];
    for (const change of validated.changes) {
      const expected = snapshot.baseShas[change.path] || null;
      const entry = latestPaths.get(change.path);
      const current = !entry ? null : entry.type === 'blob' && ['100644', '100755'].includes(String(entry.mode)) && validSha(entry.sha) ? entry.sha : 'unsafe-or-changed';
      const segments = change.path.split('/');
      const shapeConflict = segments.slice(1).some((_, index) => {
        const ancestor = segments.slice(0, index + 1).join('/');
        const ancestorEntry = latestPaths.get(ancestor);
        return ancestorEntry && !(ancestorEntry.type === 'tree' && String(ancestorEntry.mode) === '040000');
      }) || (change.content !== null && currentTree.data.tree.some((candidate) => candidate.path.startsWith(`${change.path}/`)));
      if (current !== expected || shapeConflict) conflicts.push(change.path);
    }
    if (conflicts.length) return githubJson({ error: 'base_conflict', message: 'Some reviewed paths changed in GitHub after import. Refresh those files before publishing.', conflicts: conflicts.slice(0, 20) }, 409);

    const changes = validated.changes.map((change) => change.content === null
      ? { path: change.path, sha: null }
      : { path: change.path, mode: snapshot.baseModes?.[change.path] === '100755' ? '100755' : '100644', type: 'blob', content: change.content });
    const tree = await fetchGitHubJson(auth.session.accessToken, `${prefix}/trees`, { method: 'POST', body: { base_tree: currentTreeSha, tree: changes } });
    if (!tree.ok || !validSha(tree.data?.sha)) return githubJson({ error: 'change_tree_failed', message: 'GitHub could not prepare the reviewed changes.' }, tree.status === 429 ? 429 : 502);
    const title = messageText(body?.title, 180) || 'SYNTHCODE changes';
    const description = messageText(body?.description, 2_000);
    const commit = await fetchGitHubJson(auth.session.accessToken, `${prefix}/commits`, {
      method: 'POST',
      body: { message: `SYNTHCODE: ${title}`.slice(0, 240), tree: tree.data.sha, parents: [currentBase] },
    });
    if (!commit.ok || !validSha(commit.data?.sha)) return githubJson({ error: 'commit_failed', message: 'GitHub could not create the reviewed branch commit.' }, commit.status === 429 ? 429 : 502);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'changes';
    const newBranch = safeGitHubBranch(`synth/${slug}-${hashGitHubOpaque(snapshotId).slice(0, 12)}`);
    const priorPulls = await fetchGitHubJson(auth.session.accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?state=all&head=${encodeURIComponent(`${owner}:${newBranch}`)}&base=${encodeURIComponent(branch)}&per_page=1`);
    if (!priorPulls.ok || !Array.isArray(priorPulls.data)) return githubJson({ error: 'pull_request_check_failed', message: 'Could not safely check whether this import already has a pull request.' }, priorPulls.status === 429 ? 429 : 502);
    if (priorPulls.data.length) {
      const prior = priorPulls.data[0];
      const pullRequest = { number: Number(prior.number), url: typeof prior.html_url === 'string' && prior.html_url.startsWith('https://github.com/') ? prior.html_url : null, title: String(prior.title || title).slice(0, 180), branch: newBranch, base: branch };
      try { await saveGitHubImportSnapshot(snapshotId, { ...snapshot, submittedPullRequest: pullRequest, submittedAt: Date.now() }); } catch { keepLock = true; }
      return githubJson({ ok: true, pullRequest, alreadyCreated: true, snapshotRecorded: !keepLock }, 200);
    }
    const createdRef = await fetchGitHubJson(auth.session.accessToken, `${prefix}/refs`, { method: 'POST', body: { ref: `refs/heads/${newBranch}`, sha: commit.data.sha } });
    if (!createdRef.ok) {
      const existingRef = await fetchGitHubJson(auth.session.accessToken, `${prefix}/ref/heads/${newBranch.split('/').map(encodeURIComponent).join('/')}`);
      const existingCommit = existingRef.ok && validSha(existingRef.data?.object?.sha)
        ? await fetchGitHubJson(auth.session.accessToken, `${prefix}/commits/${existingRef.data.object.sha}`)
        : null;
      const sameReviewedCommit = existingCommit?.ok
        && existingCommit.data?.tree?.sha === tree.data.sha
        && existingCommit.data?.parents?.[0]?.sha === currentBase;
      if (createdRef.status !== 422 || !sameReviewedCommit) {
        return githubJson({ error: 'branch_creation_failed', message: 'GitHub could not safely create or confirm the review branch. Your SYNTHCODE working copy is unchanged.' }, createdRef.status === 429 ? 429 : 409);
      }
    }
    const pull = await fetchGitHubJson(auth.session.accessToken, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`, {
      method: 'POST',
      body: {
        title,
        head: newBranch,
        base: branch,
        body: `${description || 'Changes prepared in SYNTHCODE.'}\n\nCreated on a separate branch for review. SYNTH did not merge or deploy this change.`.slice(0, 3_000),
        maintainer_can_modify: false,
        draft: false,
      },
    });
    if (!pull.ok || !Number.isSafeInteger(Number(pull.data?.number))) {
      return githubJson({ error: 'pull_request_failed', message: 'The review branch was created, but GitHub could not open the pull request.', branch: newBranch }, pull.status === 429 ? 429 : 502);
    }
    const pullRequest = {
      number: Number(pull.data.number),
      url: typeof pull.data.html_url === 'string' && pull.data.html_url.startsWith('https://github.com/') ? pull.data.html_url : null,
      title,
      branch: newBranch,
      base: branch,
    };
    const updated = { ...snapshot, submittedPullRequest: pullRequest, submittedAt: Date.now() };
    try { await saveGitHubImportSnapshot(snapshotId, updated); }
    catch { keepLock = true; }
    return githubJson({ ok: true, pullRequest, snapshotRecorded: !keepLock, note: keepLock ? 'Pull request created. Keep this page open; a secure duplicate-prevention record is being retained temporarily.' : undefined }, 201);
  } catch {
    return githubJson({ error: 'pull_request_unavailable', message: 'GitHub could not complete the reviewed change. Your local SYNTHCODE files are unchanged.' }, 502);
  } finally {
    if (!keepLock) { try { await releaseTemp(lockKey, lockOwner, { timeoutMs: 2_000 }); } catch {} }
  }
}
