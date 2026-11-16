# Integration patterns for AI coding workspaces

**Research date:** November 15, 2026  
**Author:** Manus AI

## What the platforms actually integrate

A connected GitHub account does not mean the same thing in every product. The reviewed platforms separate repository context, ongoing Git synchronization, AI edits, pull requests, and deployment. Those actions have different permissions and should not be presented as one all-powerful “integration.”

**Claude** offers a GitHub context integration that lets a user select a branch and files or folders for a chat or Project. Its documented sync is for file names and contents; it does not provide commit history, pull requests, or repository write-back. Claude Code GitHub Actions is a separate workflow-runner feature that can edit files and create pull requests when an administrator installs the GitHub App and configures a workflow and credentials. [1] [2] [3]

**Replit** separates one-time repository import from ongoing Git source control and Agent connectors. Its Git pane supports pulling, committing, pushing, and publishing branches. Its import path can use public or private GitHub repositories, but import alone is not documented as a continuing sync. Its connector documentation does not specify the exact GitHub permissions, so they should not be guessed. [4] [5] [6]

**GitHub Copilot** can use a repository as working context, edit files, run tests, and submit changes for review when the user has the required repository access. Repository MCP servers are configured by a repository administrator, and their tools can run autonomously after setup. Separately, the Copilot agent-task API documents user-to-server tokens and a fine-grained repository permission. These are distinct authorization paths, not a general permission to let an unrelated application use Copilot. [7] [8] [9]

**Vercel v0** imports a GitHub repository into a sandbox, makes changes on a separate working branch, and can open or update a pull request. Publishing remains subject to branch protection, required checks, and human review. Vercel deployment permissions are separate from GitHub repository access. [10] [11]

**ChatGPT**'s GitHub connection retrieves selected repository content on demand and is read-only; it does not push commits or create pull requests. Custom MCP connections are a separate capability, using OAuth 2.1 authorization-code flow with PKCE when configured. [12] [13]

## Security pattern for a SYNTH GitHub integration

GitHub recommends selecting only the permissions a GitHub App needs. Installation and user authorization are separate: installation selects the repositories an app may reach, while user authorization allows it to act for that person. A user access token is constrained by both sets of permissions and by the user's own repository rights. [14] [15]

For an integration that imports project files and proposes changes, a GitHub App is a better fit than a broad OAuth `repo` grant. A narrow setup can request repository **Contents** access and **Pull requests** access, with **Metadata** read access. The installer can choose selected repositories. SYNTH should create a new branch and request review through a pull request, never write directly to the protected default branch or merge automatically. GitHub App user tokens can be configured to expire after eight hours and refreshed; refresh tokens last six months and rotate when used. [14] [16] [17]

The token must stay server-side. SYNTH can use the existing shared Upstash storage for short-lived, opaque session references and tokens, while the browser receives only an HTTP-only session cookie. OAuth state and PKCE should protect the authorization callback. Repository files remain in the user's SYNTHCODE workspace, and secret-like files such as `.env` and private keys should be excluded before import. SYNTHCODE's existing file pipeline can then use imported text as project context, but its browser preview and source-only language limits still apply.

## What this means for SYNTH

The current SYNTH repository has public GitHub search/README-reading tools, but those do not authorize access to private repositories, preserve a working tree, or write back changes. SYNTHCODE keeps its current project files in component state and already supports multi-file edits, source export, and ZIP download. It does not yet have user login, repository authorization, durable project sessions, or Git branch/PR operations. This is why merely adding a repository URL or reusing the GitHub/Vercel deployment connection would not provide a real user integration.

The practical first release is a first-class GitHub App connection in sidebar Settings, a repository/branch/file importer in SYNTHCODE, and a reviewable change set that can be submitted as a new branch and pull request after the user approves it. Files must be bounded, text-only, path-validated, and kept out of public responses. Imported source is sent to SYNTH's configured AI providers when the user asks SYNTHCODE to edit it; the UI must state this and warn users not to import secrets.

There is no shared “connect Claude, Replit, Copilot, and v0” authorization API. Their GitHub flows differ, and their MCP/API access depends on product-specific endpoints, user consent, plans, and permissions. A SYNTH user can work with a project created by those tools through a GitHub repository, but SYNTH must not claim it can directly access those accounts. Direct connectors should be added one at a time after the target service documents a supported API or MCP endpoint and the corresponding consent flow is implemented.

## References

[1]: https://support.anthropic.com/en/articles/11176164-pre-built-integrations-using-remote-mcp "Use connectors to extend Claude’s capabilities"
[2]: https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp "Get started with custom connectors using remote MCP"
[3]: https://support.anthropic.com/en/articles/10167454-using-the-github-integration "Use the GitHub integration"
[4]: https://docs.replit.com/features/workspace-tools/git-interface "Using the Git pane"
[5]: https://docs.replit.com/build/import-from-providers "Import from a provider"
[6]: https://docs.replit.com/chat/connectors "Agent Connectors"
[7]: https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github "Copilot on GitHub.com and GitHub Mobile"
[8]: https://docs.github.com/en/copilot/concepts/customizations/mcp "Model Context Protocol"
[9]: https://docs.github.com/en/rest/agent-tasks/agent-tasks "REST API endpoints for agent tasks"
[10]: https://v0.dev/docs/github "GitHub"
[11]: https://v0.dev/docs/git-import "Import from GitHub"
[12]: https://help.openai.com/en/articles/11145903-connecting-github-to-chatgpt "Connecting GitHub to ChatGPT"
[13]: https://developers.openai.com/plugins/build/auth "Authentication for plugin MCP servers"
[14]: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app "Choosing permissions for a GitHub App"
[15]: https://docs.github.com/en/apps/using-github-apps/authorizing-github-apps "Authorizing GitHub Apps"
[16]: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app "Generating a user access token for a GitHub App"
[17]: https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens "Refreshing user access tokens"


## GitHub App implementation details checked against official docs

GitHub sends `installation_id` to an App's setup URL after installation, but explicitly warns that callers can spoof that query value. SYNTH must therefore verify it against the authenticated user's `GET /user/installations` results before treating the installation as connected. GitHub distinguishes this setup URL from the OAuth authorization callback. [18] [19]

For the user-to-server workflow, GitHub documents listing installations accessible to the user and listing repositories for a specific installation. Use the latter endpoint for repository discovery so the user token and selected installation both constrain access. The REST permission matrix places repository tree/commit/reference writes under **Contents: write** and pull-request creation under **Pull requests: write**; repository metadata is read-only. No Administration, Actions, Issues, or deployment permission is needed for the planned import-and-PR workflow. [19] [20] [21]

A recursive Git Tree response can report `truncated: true`; the importer must reject incomplete trees rather than silently show or import a partial repository. For publication, use `base_tree` when creating the new tree, and create a pull request with explicit `head` and `base`; never update the default branch directly. [20] [21]

[18]: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-setup-url "About the setup URL"
[19]: https://docs.github.com/en/rest/apps/installations "REST API endpoints for app installations"
[20]: https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps "Permissions required for GitHub Apps"
[21]: https://docs.github.com/en/rest/git/trees "REST API endpoints for Git trees"
[22]: https://docs.github.com/en/rest/pulls/pulls "REST API endpoints for pull requests"


## OAuth parameter verification (November 16, 2026)

GitHub's current user-access-token documentation confirms that GitHub Apps do **not** use OAuth scopes to control repository permissions: those come from the App's fine-grained permissions and the intersection of the user's own access with the selected installation. The optional `scope=offline_access` value is the documented way to request expiring user access and refresh tokens; no other scopes are supported for GitHub Apps. GitHub also recommends PKCE S256 and requires the exchange `code_verifier` to match the original authorization challenge. The callback `redirect_uri` must exactly match a configured App callback URL. SYNTH uses these documented parameters and keeps both access and refresh tokens encrypted on the server. [16] [17]
