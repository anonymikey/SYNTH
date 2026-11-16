'use client';

import { useCallback, useEffect, useState } from 'react';
import { GitHubMark } from '../lib/icons';

const notices = {
  connected: 'GitHub connected. Choose which repositories SYNTH may reach in the GitHub App installation.',
  installed: 'GitHub installation verified. Its selected repositories are now available in SYNTHCODE.',
  cancelled: 'GitHub connection was cancelled. No new connection was saved.',
  expired: 'The GitHub authorization expired. Reconnect to continue.',
  unavailable: 'GitHub is temporarily unavailable or the workspace owner has not completed setup.',
  invalid: 'The GitHub callback could not be verified. Start the connection again from Settings.',
};

async function readJson(response) {
  try { return await response.json(); } catch { return {}; }
}

export default function GitHubIntegrationSettings({ notice = '' }) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [successPopup, setSuccessPopup] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/integrations/github/status', { cache: 'no-store' });
      const data = await readJson(response);
      if (!response.ok && response.status !== 503) throw new Error('Could not check GitHub connection.');
      setState(data);
      if (response.status === 503) setError(data.message || 'GitHub connection status is temporarily unavailable.');
    } catch {
      setError('Could not check GitHub connection. Try refreshing this panel.');
      setState(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (notices[notice]) setMessage(notices[notice]);
    if (notice !== 'installed') return undefined;
    setSuccessPopup(true);
    const timer = setTimeout(() => setSuccessPopup(false), 5200);
    return () => clearTimeout(timer);
  }, [notice]);

  async function disconnect() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/integrations/github/disconnect', { method: 'POST', cache: 'no-store' });
      const data = await readJson(response);
      if (!response.ok) throw new Error(data.message || 'Could not disconnect GitHub.');
      setMessage(data.revoked
        ? 'GitHub authorization revoked and disconnected from this browser.'
        : 'Disconnected from this browser. If GitHub could not be reached, revoke the app in GitHub Settings too.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not disconnect GitHub.');
    } finally { setBusy(false); }
  }

  if (loading && !state) return <div className="integration-panel" role="status">Checking connected services…</div>;

  return (
    <div className="integration-panel">
      <div className="integration-intro">
        <span className="integration-kicker">SYNTH CONNECT</span>
        <h3>Integrations</h3>
        <p>Bring a repository into SYNTHCODE, make changes in its existing project workspace, and review a new branch before opening a pull request. Project edits stay in the current page until downloaded or submitted; they are not yet saved as a durable SYNTH project.</p>
      </div>
      {message && <p className="integration-notice" role="status">{message}</p>}
      {error && <p className="integration-error" role="alert">{error}</p>}
      {successPopup && <div className="github-connected-toast" role="status" aria-live="polite" aria-atomic="true">
        <span className="github-connected-toast-mark" aria-hidden="true">✓</span>
        <span><b>GitHub connected</b><small>Your selected repositories are ready to import into SYNTHCODE.</small></span>
        <button type="button" aria-label="Dismiss GitHub connected message" onClick={() => setSuccessPopup(false)}>×</button>
      </div>}

      <section className="integration-card" aria-labelledby="github-integration-title">
        <div className="integration-card-head">
          <span className="integration-github-mark"><GitHubMark size={22} /></span>
          <div><h4 id="github-integration-title">GitHub</h4><p>Selected-repository access · SYNTHCODE import and pull requests</p></div>
          <span className={'integration-state' + (state?.connected && state?.installations?.length ? ' connected' : '')}>
            {state?.connected && state?.installations?.length ? 'Connected' : state?.connected ? 'Finish setup' : 'Not connected'}
          </span>
        </div>

        {!state?.configured ? (
          <div className="integration-setup">
            <b>{state?.storageReady === false ? 'Secure shared storage is required' : 'Workspace setup required'}</b>
            <p>{state?.storageReady === false
              ? 'The workspace owner must configure shared Upstash Redis before encrypted GitHub sessions can be stored.'
              : 'The workspace owner must configure a GitHub App and server-only credentials before accounts can connect.'}</p>
            <span className="integration-setup-hint">Once GitHub App setup is complete, refresh this panel to connect.</span>
          </div>
        ) : !state?.connected ? (
          <div className="integration-setup">
            <p>Authorize your GitHub account, then GitHub will take you directly to the SYNTH App installation screen. Choose only the repositories you want SYNTH to access.</p>
            <a className="integration-action primary" href="/api/integrations/github/start">Connect GitHub</a>
          </div>
        ) : (
          <div className="integration-connected">
            <div className="integration-account"><span className="integration-account-dot" aria-hidden="true" />Connected as <b>@{state.account?.login || 'GitHub user'}</b></div>
            <div className="integration-installations" aria-label="GitHub App installations">
              {Array.isArray(state.installations) && state.installations.length > 0
                ? state.installations.map((installation) => (
                  <div className="integration-installation" key={installation.id}>
                    <b>{installation.account || 'GitHub account'}</b>
                    <span>{installation.accountType} · {installation.repositorySelection === 'all' ? 'all account repositories' : 'selected repositories'}</span>
                  </div>
                ))
                : <p>No app installation is linked yet. Install the GitHub App and select the repositories you want SYNTH to access.</p>}
            </div>
            <div className="integration-actions">
              <a className="integration-action" href={state.installUrl || 'https://github.com/settings/installations'} target="_blank" rel="noreferrer">Choose repositories in GitHub</a>
              <a className="integration-link" href="https://github.com/settings/installations" target="_blank" rel="noreferrer">Manage installations</a>
              <button type="button" className="integration-disconnect" onClick={disconnect} disabled={busy}>{busy ? 'Disconnecting…' : 'Disconnect'}</button>
            </div>
          </div>
        )}
      </section>

      <div className="integration-guardrails">
        <b>How repository access works</b>
        <ul>
          <li>GitHub permissions and installation-selected repositories limit access; tokens stay encrypted on the server.</li>
          <li>Only selected text files are imported. Secret-like, workflow, oversized and binary files are excluded.</li>
          <li>Imported source is sent to SYNTH’s configured AI services when you ask SYNTHCODE to edit it. Do not import secrets.</li>
          <li>Imported browser code does not run on import. Web preview requires a separate confirmation; Python, Rust, Go, C++, and backend projects remain source-only.</li>
          <li>Publishing creates a separate branch and pull request. SYNTH does not merge, directly update the base branch, or deploy it.</li>
        </ul>
        <p>GitHub is the first direct connector. Projects from Claude, Replit, Copilot or v0 can be imported through GitHub; their separate accounts are not connected by this adapter.</p>
      </div>
      <div className="integration-footer-actions">
        <button type="button" className="integration-link-button" onClick={refresh} disabled={loading || busy}>{loading ? 'Refreshing…' : 'Refresh connection'}</button>
      </div>
    </div>
  );
}
