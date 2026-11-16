'use client';

import { useEffect, useRef, useState } from 'react';

async function apiJson(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.message || 'GitHub could not create the review request.');
  return data;
}

const ACTION = { add: 'Add', edit: 'Edit', delete: 'Delete' };

export default function GitHubPullRequestDialog({ open, repository, changes = [], onClose, onCreated }) {
  const [title, setTitle] = useState('SYNTHCODE changes');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);
  const dialog = useRef(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('input, textarea, button')?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busyRef.current) closeRef.current(); }
      if (event.key !== 'Tab') return;
      const items = [...(dialog.current?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled)') || [])];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) { setTitle('SYNTHCODE changes'); setDescription(''); setConfirmed(false); setBusy(false); setError(''); setCreated(null); }
  }, [open, repository?.snapshotId]);

  if (!open || !repository) return null;

  async function createPullRequest() {
    if (busy || !confirmed || changes.length === 0) return;
    busyRef.current = true;
    setBusy(true); setError('');
    try {
      const result = await apiJson('/api/integrations/github/pull-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installation: repository.installation,
          repositoryPage: repository.repositoryPage,
          repository: repository.repository,
          branch: repository.branch,
          baseCommitSha: repository.baseCommitSha,
          snapshotId: repository.snapshotId,
          title,
          description,
          changes,
        }),
      });
      setCreated(result.pullRequest);
      onCreated?.(result.pullRequest);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the pull request. Your local SYNTHCODE files are unchanged.'); }
    finally { busyRef.current = false; setBusy(false); }
  }

  return (
    <div className="github-import-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="github-import-dialog github-pr-dialog" role="dialog" aria-modal="true" aria-labelledby="github-pr-title" ref={dialog}>
        <header className="github-import-head">
          <div><span className="integration-kicker">REVIEW BEFORE PUBLISHING</span><h2 id="github-pr-title">Create a pull request</h2><p>Open a new branch in <b>{repository.repository}</b> against <code>{repository.branch}</code>.</p></div>
          <button type="button" className="iconbtn sm" onClick={onClose} aria-label="Close pull request review" disabled={busy}>×</button>
        </header>
        {created ? (
          <div className="github-pr-success" role="status">
            <span className="github-pr-success-mark" aria-hidden="true">✓</span>
            <h3>Pull request opened</h3>
            <p>Branch <code>{created.branch}</code> is ready for review. SYNTH did not merge or deploy it.</p>
            {created.url && <a className="integration-action primary" href={created.url} target="_blank" rel="noreferrer">Review pull request #{created.number}</a>}
            <button type="button" className="integration-link-button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {error && <p className="integration-error" role="alert">{error}</p>}
            <label className="github-pr-field">Pull request title<input maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="github-pr-field">Description<textarea maxLength={2000} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what changed and anything reviewers should know." /></label>
            <div className="github-pr-changes">
              <div className="github-pr-changes-head"><b>Files to submit</b><span>{changes.length} change{changes.length === 1 ? '' : 's'}</span></div>
            <ul>{changes.map((change) => {
              const preview = typeof change.content === 'string' ? change.content.slice(0, 4_000) : '';
              const previewLines = preview.split('\n').slice(0, 40).join('\n');
              const truncated = typeof change.content === 'string' && (change.content.length > preview.length || preview.split('\n').length > 40);
              return <li key={change.path} className={`is-${change.kind}`}><span>{ACTION[change.kind] || change.kind}</span><div className="github-pr-file-detail"><code>{change.path}</code><details><summary>Inspect proposed content</summary><pre>{change.content === null ? 'This file will be deleted.' : `${previewLines}${truncated ? '\n… preview truncated; inspect the full file in SYNTHCODE Code view.' : ''}`}</pre></details></div></li>;
            })}</ul>
            </div>
            <p className="github-import-disclosure">SYNTH creates only a separate branch and pull request. It will not change the base branch, merge the request, run repository code, or deploy.</p>
            <label className="github-pr-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I reviewed these paths and authorize SYNTH to create this branch and pull request in my connected GitHub repository.</span></label>
            <footer className="github-import-footer">
              <button type="button" className="integration-link-button" onClick={onClose} disabled={busy}>Cancel</button>
              <button type="button" className="integration-action primary" onClick={createPullRequest} disabled={!confirmed || !changes.length || !title.trim() || busy}>{busy ? 'Creating review branch…' : 'Create pull request'}</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
