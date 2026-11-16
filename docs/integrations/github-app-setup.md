# Configure GitHub for SYNTH

SYNTH's repository integration is optional. The app works without it; until configured, the Integrations settings panel explains that GitHub is unavailable.

## 1. Create a GitHub App

In GitHub, open **Settings → Developer settings → GitHub Apps → New GitHub App**. Use a recognizable name such as **SYNTH Workspace** and choose the account/organization that will own the app.

Set **Callback URL** to the exact deployed SYNTH URL:

```text
https://YOUR-SYNTH-DOMAIN/api/integrations/github/callback
```

Set **Setup URL** to:

```text
https://YOUR-SYNTH-DOMAIN/api/integrations/github/installed
```

Use the same HTTPS origin in both values, with no extra slash, query, or fragment. GitHub redirects installation changes to this setup URL; SYNTH independently verifies each returned installation against the signed-in GitHub user's installation list.

Enable **Expire user authorization tokens**. SYNTH uses GitHub's short-lived user access token and rotating refresh token flow. Do not enable device flow for this integration.

### Minimum permissions

Under **Repository permissions**, grant only:

- **Contents: Read and write** — read selected text files and create a review branch commit.
- **Pull requests: Read and write** — open the pull request after explicit user review.
- **Metadata: Read-only** — GitHub's required repository metadata access.

Do not grant Administration, Actions, Issues, Deployments, or organization permissions. Under **Where can this GitHub App be installed?**, choose the appropriate availability for your users. Installation can be limited to selected repositories; selected repositories are the recommended choice.

Save the App, then copy its **Client ID**, create a **Client secret**, and note the App's URL slug from its GitHub address.

## 2. Configure Vercel environment variables

In **Vercel → your SYNTH project → Settings → Environment Variables**, add these as server-side values for **Production** (and Preview only if you separately want the integration enabled there):

```text
GITHUB_APP_CLIENT_ID=<GitHub App Client ID>
GITHUB_APP_CLIENT_SECRET=<GitHub App client secret>
GITHUB_APP_SLUG=<GitHub App URL slug>
GITHUB_CALLBACK_URL=https://YOUR-SYNTH-DOMAIN/api/integrations/github/callback
GITHUB_SETUP_URL=https://YOUR-SYNTH-DOMAIN/api/integrations/github/installed
GITHUB_SESSION_SECRET=<64 hexadecimal characters>
```

Generate a random encryption secret locally, without sharing it:

```bash
openssl rand -hex 32
```

`GITHUB_SESSION_SECRET` encrypts stored GitHub credentials and import snapshots. Keep it private. Do not add credentials to source code, GitHub, client-exposed `NEXT_PUBLIC_*` variables, or a support message.

SYNTH also requires the existing shared Upstash variables `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. GitHub sessions are encrypted before storage; Redis also holds short-lived OAuth state and expiring import snapshots. If shared storage is unavailable, SYNTH refuses GitHub authorization/import rather than keeping a token only in process memory.

Redeploy after changing environment values. In SYNTH, open **Settings → Integrations → GitHub → Connect GitHub**. Authorize the app, then install it for only the repositories you intend to use. You can change repository selection later in GitHub and refresh the Integrations panel.

## 3. What users can do

Connected users can choose an authorized repository, branch, and specific safe text files to import into SYNTHCODE. Secret-like files, credentials, GitHub workflow files, binary files, unsafe paths, and oversized files are filtered or rejected. Imported source is provided to SYNTH's configured AI service when the user asks for a code change; users should not import secrets. Each edit request includes up to 40,000 source characters and prefers the open file when it fits, so not every selected file may fit; open the most relevant file first. SYNTHCODE's first-version working copy lives only in the current page; download it or submit a pull request before leaving or refreshing.

Imported project files enter the existing SYNTHCODE editor and can be edited using the repository's existing file structure and language. They do not run automatically. If the project contains a browser page, SYNTHCODE asks separately before loading it in its isolated browser preview. Imported TypeScript, Python, Rust, Go, C++, and backend projects remain source-only and are not compiled or executed by SYNTHCODE.

Before opening a pull request, SYNTHCODE lists the imported-file changes and new files, checks the current repository revision for conflicts, and asks the user to authorize the exact branch/PR action. It creates a separate branch and pull request; it never writes directly to the base branch, merges the request, runs source-only code, or deploys it. A failed request leaves the SYNTHCODE working copy intact.

Claude, Replit, Copilot, and v0 accounts are not directly connected by this GitHub App. A project from those tools can be used through a GitHub repository only when the user independently authorizes that repository for SYNTH.

## 4. Disconnect and revoke

Users can choose **Settings → Integrations → GitHub → Disconnect**. SYNTH attempts to revoke the GitHub App grant and always removes the encrypted browser session. If GitHub cannot be reached during revocation, the panel tells the user to remove SYNTH in **GitHub → Settings → Applications → Authorized GitHub Apps** as well. Removing an app installation also withdraws that repository scope.
