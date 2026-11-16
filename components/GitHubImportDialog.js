'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

async function apiJson(url, options) {
  const response = await fetch(url, { cache: 'no-store', ...options });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.message || 'The GitHub request could not be completed.');
  return data;
}

export default function GitHubImportDialog({ open, existingFiles = {}, onClose, onImport }) {
  const [connection, setConnection] = useState(null);
  const [installation, setInstallation] = useState('');
  const [repos, setRepos] = useState([]);
  const [repoPage, setRepoPage] = useState(1);
  const [reposHasMore, setReposHasMore] = useState(false);
  const [repository, setRepository] = useState(null);
  const [branches, setBranches] = useState([]);
  const [branchPage, setBranchPage] = useState(1);
  const [branchesHasMore, setBranchesHasMore] = useState(false);
  const [branch, setBranch] = useState('');
  const [tree, setTree] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [replaceConfirmed, setReplaceConfirmed] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const dialog = useRef(null);
  const onCloseRef = useRef(onClose);
  const branchRef = useRef(branch);
  const busyRef = useRef(busy);
  const repositoriesRequest = useRef(0);
  const branchesRequest = useRef(0);
  const treeRequest = useRef(0);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { branchRef.current = branch; }, [branch]);
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => {
    if (open) return;
    repositoriesRequest.current += 1;
    branchesRequest.current += 1;
    treeRequest.current += 1;
  }, [open]);

  const refreshConnection = useCallback(async () => {
    setBusy('connection');
    setError('');
    try {
      const data = await apiJson('/api/integrations/github/status');
      setConnection(data);
      const first = data.installations?.[0];
      setInstallation((current) => data.installations?.some((item) => String(item.id) === current) ? current : (first ? String(first.id) : ''));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load the GitHub connection.'); }
    finally { setBusy(''); }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    refreshConnection();
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('button, a, input, select')?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); if (!busyRef.current) onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = [...(dialog.current?.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)') || [])];
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open, refreshConnection]);

  const selectedInstallation = useMemo(() => connection?.installations?.find((item) => String(item.id) === installation), [connection, installation]);

  const loadRepositories = useCallback(async (page = 1, append = false) => {
    if (!installation) return;
    const requestId = ++repositoriesRequest.current;
    setBusy('repositories');
    setError('');
    try {
      const data = await apiJson(`/api/integrations/github/repositories?installation=${encodeURIComponent(installation)}&page=${page}`);
      if (requestId !== repositoriesRequest.current) return;
      const pageRepositories = data.repositories.map((item) => ({ ...item, repositoryPage: page }));
      setRepos((current) => append ? [...current, ...pageRepositories] : pageRepositories);
      setRepoPage(page);
      setReposHasMore(Boolean(data.hasMore));
    } catch (reason) { if (requestId === repositoriesRequest.current) setError(reason instanceof Error ? reason.message : 'Could not load GitHub repositories.'); }
    finally { if (requestId === repositoriesRequest.current) setBusy(''); }
  }, [installation]);

  useEffect(() => {
    if (!open || !connection?.connected || !installation) return;
    setRepos([]); setReposHasMore(false); setRepository(null); setBranches([]); setBranchesHasMore(false); setBranch(''); setTree(null); setSelected([]);
    loadRepositories(1, false);
  }, [open, connection?.connected, installation, loadRepositories]);

  const loadBranches = useCallback(async (page = 1, append = false) => {
    if (!installation || !repository?.fullName) return;
    const requestId = ++branchesRequest.current;
    setBusy('branches');
    setError('');
    try {
      const data = await apiJson(`/api/integrations/github/branches?installation=${encodeURIComponent(installation)}&repository=${encodeURIComponent(repository.fullName)}&repositoryPage=${repository.repositoryPage}&page=${page}`);
      if (requestId !== branchesRequest.current) return;
      setBranches((current) => append ? [...current, ...data.branches] : data.branches);
      setBranchPage(page);
      setBranchesHasMore(Boolean(data.hasMore));
      if (!append && !branchRef.current && data.branches.includes(repository.defaultBranch)) setBranch(repository.defaultBranch);
    } catch (reason) { if (requestId === branchesRequest.current) setError(reason instanceof Error ? reason.message : 'Could not load GitHub branches.'); }
    finally { if (requestId === branchesRequest.current) setBusy(''); }
  }, [installation, repository]);

  useEffect(() => {
    if (!open || !repository?.fullName || !installation) return;
    setBranches([]); setBranchesHasMore(false); setTree(null); setSelected([]); setBranch('');
    loadBranches(1, false);
  }, [open, repository?.fullName, installation, loadBranches]);

  const loadTree = useCallback(async () => {
    if (!installation || !repository?.fullName || !branch) return;
    const requestId = ++treeRequest.current;
    setBusy('tree'); setError(''); setTree(null); setSelected([]);
    try {
      const query = new URLSearchParams({ installation, repository: repository.fullName, repositoryPage: String(repository.repositoryPage), branch });
      const data = await apiJson(`/api/integrations/github/tree?${query}`);
      if (requestId === treeRequest.current) setTree(data);
    } catch (reason) { if (requestId === treeRequest.current) setError(reason instanceof Error ? reason.message : 'Could not load the repository tree.'); }
    finally { if (requestId === treeRequest.current) setBusy(''); }
  }, [installation, repository, branch]);

  useEffect(() => { if (open && branch && repository?.fullName) loadTree(); }, [open, branch, repository?.fullName, loadTree]);

  const visibleFiles = useMemo(() => {
    const value = search.trim().toLowerCase();
    return (tree?.files || []).filter((file) => !value || file.path.toLowerCase().includes(value));
  }, [tree, search]);
  const selectedFiles = useMemo(() => (tree?.files || []).filter((file) => selected.includes(file.path)), [tree, selected]);
  const selectedBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const overlaps = selected.filter((path) => Object.prototype.hasOwnProperty.call(existingFiles, path));

  function chooseRepository(value) {
    branchesRequest.current += 1;
    treeRequest.current += 1;
    setRepository(repos.find((item) => item.fullName === value) || null);
    setBranch(''); setTree(null); setSelected([]); setReplaceConfirmed(false);
  }

  function togglePath(path) {
    setSelected((current) => {
      if (current.includes(path)) return current.filter((item) => item !== path);
      const file = tree?.files?.find((item) => item.path === path);
      const currentBytes = selected.reduce((sum, item) => sum + (tree?.files?.find((candidate) => candidate.path === item)?.size || 0), 0);
      if (current.length >= 50 || currentBytes + (file?.size || 0) > 400_000) return current;
      return [...current, path];
    });
    setReplaceConfirmed(false);
  }

  function selectVisible() {
    setSelected((current) => {
      const next = new Set(current);
      let bytes = selectedBytes;
      for (const file of visibleFiles) {
        if (next.has(file.path) || next.size >= 50) continue;
        if (bytes + file.size > 400_000) continue;
        next.add(file.path); bytes += file.size;
      }
      return [...next];
    });
    setReplaceConfirmed(false);
  }

  async function importSelected() {
    if (!tree || selected.length < 1 || busy) return;
    if (overlaps.length && !replaceConfirmed) return;
    busyRef.current = true;
    setBusy('import'); setError('');
    try {
      const data = await apiJson('/api/integrations/github/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installation: Number(installation), repositoryPage: repository.repositoryPage, repository: repository.fullName, branch, baseCommitSha: tree.baseCommitSha, paths: selected }),
      });
      await onImport(data);
      onClose();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not import those files.'); }
    finally { busyRef.current = false; setBusy(''); }
  }

  if (!open) return null;
  const configured = Boolean(connection?.configured);
  const connected = Boolean(connection?.connected);
  const close = () => { if (!busy) onClose(); };

  return (
    <div className="github-import-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="github-import-dialog" role="dialog" aria-modal="true" aria-labelledby="github-import-title" ref={dialog}>
        <header className="github-import-head">
          <div><span className="integration-kicker">SYNTHCODE · REPOSITORY</span><h2 id="github-import-title">Import from GitHub</h2><p>Choose an authorized installation, repository, branch and the text files SYNTHCODE should bring into this project.</p></div>
          <button type="button" className="iconbtn sm" onClick={close} aria-label="Close GitHub import" disabled={!!busy}>×</button>
        </header>
        {error && <p className="integration-error" role="alert">{error}</p>}
        {!configured ? (
          <div className="github-import-empty">
            <h3>{connection?.storageReady === false ? 'Secure shared storage is required' : 'GitHub setup is not complete'}</h3>
            <p>The workspace owner must configure the GitHub App and encrypted session storage before repository access is available.</p>
            <button type="button" className="integration-action" onClick={refreshConnection} disabled={busy === 'connection'}>{busy === 'connection' ? 'Checking…' : 'Check again'}</button>
          </div>
        ) : !connected ? (
          <div className="github-import-empty">
            <h3>Connect your GitHub account</h3>
            <p>SYNTH uses the GitHub App authorization flow. Tokens stay on the server; SYNTH never asks you to paste a personal access token.</p>
            <a className="integration-action primary" href="/api/integrations/github/start">Connect GitHub</a>
          </div>
        ) : (
          <>
            {(!connection.installations || connection.installations.length === 0) && <div className="github-import-empty github-import-no-install"><h3>Install the SYNTH GitHub App</h3><p>Your GitHub account is connected, but no app installation is linked. Choose only the repositories you want SYNTH to access.</p><a className="integration-action primary" href={connection.installUrl || 'https://github.com/settings/installations'} target="_blank" rel="noreferrer">Choose repositories in GitHub</a></div>}
            <div className="github-import-selectors">
              <label>Installation<select value={installation} onChange={(event) => { repositoriesRequest.current += 1; branchesRequest.current += 1; treeRequest.current += 1; setRepository(null); setTree(null); setSelected([]); setInstallation(event.target.value); }}>
                {(connection.installations || []).map((item) => <option key={item.id} value={item.id}>{item.account} · {item.accountType}</option>)}
              </select></label>
              <label>Repository<select value={repository?.fullName || ''} onChange={(event) => chooseRepository(event.target.value)} disabled={!repos.length || busy === 'repositories'}>
                <option value="">{busy === 'repositories' ? 'Loading repositories…' : 'Choose a repository'}</option>
                {repos.map((item) => <option key={item.fullName} value={item.fullName}>{item.fullName}{item.private ? ' · private' : ''}</option>)}
              </select></label>
              <label>Branch<select value={branch} onChange={(event) => { treeRequest.current += 1; setTree(null); setSelected([]); setBranch(event.target.value); }} disabled={!branches.length || busy === 'branches'}>
                <option value="">{busy === 'branches' ? 'Loading branches…' : 'Choose a branch'}</option>
                {branches.map((name) => <option key={name} value={name}>{name}</option>)}
              </select></label>
            </div>
            {selectedInstallation?.repositorySelection === 'all' && <p className="github-import-warning">This installation has access to all repositories in the selected account. You can narrow it in GitHub App settings.</p>}
            {repos.length > 0 && <div className="github-import-pagination"><span>{repos.length} repositories loaded</span>{reposHasMore && <button type="button" onClick={() => loadRepositories(repoPage + 1, true)} disabled={busy === 'repositories'}>Load more repositories</button>}</div>}
            {repository && branches.length > 0 && <div className="github-import-pagination"><span>{branches.length} branches loaded</span>{branchesHasMore && <button type="button" onClick={() => loadBranches(branchPage + 1, true)} disabled={busy === 'branches'}>Load more branches</button>}</div>}

            {busy === 'tree' && <div className="github-import-loading" role="status">Reading the selected branch…</div>}
            {tree && (
              <div className="github-import-files">
                <div className="github-import-files-head"><div><b>{repository.fullName} · {branch}</b><small>{tree.safeFileCount} safe text files · {tree.filesCapped ? 'first 2,000 shown' : 'filtered repository tree'}</small></div><span>{selected.length}/50 · {(selectedBytes / 1000).toFixed(0)} KB</span></div>
                {tree.filesCapped && <p className="github-import-warning">This repository has more safe files than can be shown at once. Search for specific paths or choose from the displayed files.</p>}
                <div className="github-import-file-actions"><label>Filter files<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search file paths" /></label><button type="button" onClick={selectVisible} disabled={!visibleFiles.length}>Select visible</button><button type="button" onClick={() => { setSelected([]); setReplaceConfirmed(false); }}>Clear</button></div>
                <div className="github-import-file-list" role="group" aria-label="Safe text files to import">
                  {visibleFiles.length ? visibleFiles.map((file) => (
                    <label className="github-import-file" key={file.path}>
                      <input type="checkbox" checked={selected.includes(file.path)} onChange={() => togglePath(file.path)} disabled={!selected.includes(file.path) && (selected.length >= 50 || selectedBytes + file.size > 400_000)} />
                      <span>{file.path}</span><small>{(file.size / 1000).toFixed(1)} KB</small>
                    </label>
                  )) : <p className="github-import-no-files">No matching safe text files.</p>}
                </div>
                {overlaps.length > 0 && <label className="github-import-replace"><input type="checkbox" checked={replaceConfirmed} onChange={(event) => setReplaceConfirmed(event.target.checked)} /><span><b>{overlaps.length} selected file{overlaps.length === 1 ? '' : 's'} already exist in this workspace.</b> Replace those files with the repository versions?</span></label>}
                <p className="github-import-disclosure">Only selected text files are returned to this browser. They are sent to SYNTH’s configured AI services when you ask SYNTHCODE to edit them; do not import secrets. Each AI request includes up to 40,000 source characters and prefers the open file when it fits, so not every imported file may fit. Browser projects do not run until you approve preview. This working copy is temporary: download it or submit a pull request before leaving or refreshing the page.</p>
              </div>
            )}
          </>
        )}
        <footer className="github-import-footer">
          <button type="button" className="integration-link-button" onClick={close} disabled={!!busy}>Cancel</button>
          <button type="button" className="integration-action primary" onClick={importSelected} disabled={!tree || selected.length === 0 || !!busy || (overlaps.length > 0 && !replaceConfirmed)}>{busy === 'import' ? 'Importing…' : `Import ${selected.length || ''} file${selected.length === 1 ? '' : 's'}`}</button>
        </footer>
      </section>
    </div>
  );
}
