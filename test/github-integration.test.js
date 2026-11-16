import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const oldSecret = process.env.GITHUB_SESSION_SECRET;
process.env.GITHUB_SESSION_SECRET = 'a'.repeat(64);
const github = await import('../lib/github-app.js');
test.after(() => {
  if (oldSecret === undefined) delete process.env.GITHUB_SESSION_SECRET;
  else process.env.GITHUB_SESSION_SECRET = oldSecret;
});
const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('GitHub session records are AES-GCM encrypted and reject tampering', () => {
  const token = 'ghu_private-access-token-value';
  const record = github.encryptGitHubRecord({ accessToken: token, user: { id: 1, login: 'octocat' } });
  assert.equal(JSON.stringify(record).includes(token), false);
  assert.equal(github.decryptGitHubRecord(record).accessToken, token);
  assert.equal(github.decryptGitHubRecord({ ...record, tag: 'AAAA' }), null);
});

test('OAuth state and verifier use high-entropy S256 PKCE material', () => {
  const { state, verifier, challenge } = github.createGitHubPkce();
  assert.ok(state.length >= 40);
  assert.ok(verifier.length >= 43);
  assert.equal(challenge, createHash('sha256').update(verifier).digest('base64url'));
  assert.equal(github.safeEqualState(state, state), true);
  assert.equal(github.safeEqualState(state, 'attacker-state'), false);
});

test('selected repository must resolve to the exact authorized GitHub App installation', async (t) => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  let requestedUrl = '';
  let requestedToken = '';
  globalThis.fetch = async (url, options) => {
    requestedUrl = String(url);
    requestedToken = options.headers.Authorization;
    return Response.json({ repositories: [{ full_name: 'octocat/demo' }] });
  };
  assert.equal(await github.verifyGitHubRepositoryInstallation('ghu_user-token', 123, 'octocat/demo', 2), 'allowed');
  assert.equal(requestedUrl, 'https://api.github.com/user/installations/123/repositories?per_page=100&page=2');
  assert.equal(requestedToken, 'Bearer ghu_user-token');
  globalThis.fetch = async () => Response.json({ repositories: [{ full_name: 'octocat/other' }] });
  assert.equal(await github.verifyGitHubRepositoryInstallation('ghu_user-token', 123, 'octocat/demo', 2), 'forbidden');
  globalThis.fetch = async () => new Response('{}', { status: 404 });
  assert.equal(await github.verifyGitHubRepositoryInstallation('ghu_user-token', 123, 'octocat/demo', 2), 'forbidden');
  let called = false;
  globalThis.fetch = async () => { called = true; return Response.json({ repositories: [{ full_name: 'octocat/demo' }] }); };
  assert.equal(await github.verifyGitHubRepositoryInstallation('ghu_user-token', 123, 'octocat/../other'), 'forbidden');
  assert.equal(await github.verifyGitHubRepositoryInstallation('ghu_user-token', 123, 'octocat/demo', 0), 'forbidden');
  assert.equal(called, false);
});

test('GitHub API JSON responses are bounded by four megabytes', async (t) => {
  const prior = globalThis.fetch;
  t.after(() => { globalThis.fetch = prior; });
  globalThis.fetch = async () => new Response('{}', { headers: { 'content-length': '4000001' } });
  const result = await github.fetchGitHubJson('ghu_user-token', '/user');
  assert.equal(result.ok, false);
  assert.equal(result.status, 413);
  assert.equal(result.data, null);
});

test('repository mutations require same-origin checks and a verified installation-scoped user session', () => {
  for (const route of [
    '../app/api/integrations/github/import/route.js',
    '../app/api/integrations/github/pull-request/route.js',
    '../app/api/integrations/github/disconnect/route.js',
  ]) {
    const text = source(route);
    assert.match(text, /hasSameOrigin\(request\)/, route);
    if (!route.endsWith('/disconnect/route.js')) assert.match(text, /requireGitHubSession\(request\)/, route);
  }
  assert.match(source('../app/api/integrations/github/disconnect/route.js'), /deleteGitHubSession\(id\)/);
  for (const route of [
    '../app/api/integrations/github/branches/route.js',
    '../app/api/integrations/github/tree/route.js',
    '../app/api/integrations/github/import/route.js',
    '../app/api/integrations/github/pull-request/route.js',
  ]) assert.match(source(route), /verifyGitHubRepositoryInstallation\(/, route);
  const pullRequest = source('../app/api/integrations/github/pull-request/route.js');
  assert.match(pullRequest, /snapshot\.repositoryPage\) !== repositoryPage/);
  assert.match(pullRequest, /hashGitHubOpaque\(snapshotId\)\.slice\(0, 12\)/);
  assert.match(pullRequest, /state=all&head=/);
});

test('public GitHub connection status never returns tokens or raw GitHub errors', () => {
  const route = source('../app/api/integrations/github/status/route.js');
  assert.match(route, /account: \{ login: session\.user\.login \}/);
  assert.doesNotMatch(route, /accessToken|refreshToken|clientSecret|rawError|response\.data/);
});

test('OAuth callbacks consume one-time state and verify identity and installation ownership', () => {
  const start = source('../app/api/integrations/github/start/route.js');
  const callback = source('../app/api/integrations/github/callback/route.js');
  const installed = source('../app/api/integrations/github/installed/route.js');
  assert.match(start, /createGitHubPkce\(\)/);
  assert.match(start, /storeOAuthState\(state, verifier\)/);
  assert.match(callback, /safeEqualState\(state, cookieState\)/);
  assert.match(callback, /consumeOAuthState\(state\)/);
  assert.match(callback, /exchangeGitHubCode\(code, saved\.verifier\)/);
  assert.match(callback, /loadGitHubUser\(tokens\.access_token\)/);
  assert.match(callback, /fetchGitHubInstallations\(tokens\.access_token\)/);
  assert.match(installed, /fetchGitHubInstallations\(resolved\.session\.accessToken\)/);
  assert.match(installed, /installations\.some\(\(item\) => item\.id === id\)/);
  assert.match(installed, /saveGitHubSession\(sessionId/);
});

test('Settings exposes keyboard-navigable Personalization, Notification and New Integrations tabs', () => {
  const settings = source('../components/Personalization.js');
  assert.match(settings, /id: 'personalization'/);
  assert.match(settings, /id: 'notification'/);
  assert.match(settings, /id: 'integrations'/);
  assert.match(settings, /ArrowLeft.*ArrowRight.*Home.*End/);
  assert.match(settings, /settings-new-badge/);
  assert.match(settings, /GitHubIntegrationSettings/);
  assert.match(settings, /url\.searchParams\.delete\('integration'\)/);
});

test('SYNTHCODE imports through its existing file state and does not execute imported code before approval', () => {
  const builder = source('../components/Builder.js');
  assert.match(builder, /GitHubImportDialog/);
  assert.match(builder, /setFiles\(merged\)/);
  assert.match(builder, /diffGitHubProject/);
  assert.match(builder, /githubPreviewConsentOpen/);
  assert.match(builder, /html && previewAllowed/);
  assert.match(builder, /onClick=\{requestPreview\}/);
  assert.match(builder, /githubChanges\.length === 0/);
  assert.match(builder, /const GITHUB_REPOSITORY_SYSTEM = /);
  assert.match(builder, /untrusted project data/);
  assert.match(builder, /isGitHubProject \? GITHUB_REPOSITORY_SYSTEM/);
  assert.match(builder, /Temporary working copy/);
  assert.match(builder, /up to 40,000 source characters and prefers the open file when it fits/);
  assert.match(builder, /!isGitHubProject && \(!projectLanguage \|\| slipped/);
  assert.match(builder, /githubPreviewConsentDialog\.current\?\.querySelector/);
  assert.match(builder, /I trust this code · Open preview/);
  assert.match(builder, /event\.key === 'Escape'.*setGitHubPreviewConsentOpen\(false\)/s);
  const dialog = source('../components/GitHubPullRequestDialog.js');
  assert.match(dialog, /I reviewed these paths and authorize SYNTH/);
  assert.match(dialog, /Inspect proposed content/);
  assert.match(dialog, /Create a pull request/);
  assert.match(dialog, /did not merge or deploy/);
  assert.match(source('../components/GitHubImportDialog.js'), /up to 40,000 source characters and prefers the open file when it fits/);
  assert.match(source('../components/GitHubImportDialog.js'), /temporary: download it or submit a pull request before leaving or refreshing the page/);
});

test('Dev Update accurately marks the GitHub workflow new without claiming direct third-party access', () => {
  const updates = source('../app/dev-updates/data.js');
  assert.match(updates, /slug: 'synthcode-github-repository-workflow'/);
  assert.match(updates, /tags: \['New', 'Integrations', 'GitHub', 'SYNTHCODE'\]/);
  assert.match(updates, /SYNTH does not connect to those products’ accounts/);
  assert.match(updates, /Repository code is not run when it is imported/);
});
