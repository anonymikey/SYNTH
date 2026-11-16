'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeRain, WordCycle } from './Working';
import { FilePlus, FolderPlus, Search, Chevron, Folder, Trash, Check, Close, Edit, Copy, ArrowLeft, FileIcon } from '../lib/icons';
import { kindOf, buildTree, highlight, searchFiles, cleanPath } from '../lib/files';

const FOLDER_RE = /^[\w@.\-]+(?:\/[\w@.\-]+)*$/;

// The Code view keeps a compact file navigator alongside the open editor.
// Live file output remains text only; this component never runs repository code.
export default function FileExplorer({ files, dirs, selected, onSelect, onSave, onCreate, onFolder, onDelete, onCopy, busy, live, marks, filesOnly = false, onExitFilesOnly, importedPaths = [], modifiedPaths = [] }) {
  const [adding, setAdding] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState({});
  const [treeOpen, setTreeOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [openTabs, setOpenTabs] = useState([]);
  const [show, setShow] = useState('view');
  const picked = useRef(false);
  const scroller = useRef(null);
  const lineGutter = useRef(null);

  const liveMap = live || {};
  const paths = useMemo(() => [...new Set([...Object.keys(files), ...Object.keys(liveMap)])].sort(), [files, live]);
  const tree = useMemo(() => buildTree(paths, dirs), [paths, dirs]);
  const results = useMemo(() => (searching && q.trim() ? searchFiles(files, q.trim()) : []), [searching, q, files]);
  const importedSet = useMemo(() => new Set(importedPaths), [importedPaths]);
  const modifiedSet = useMemo(() => new Set(modifiedPaths), [modifiedPaths]);

  const livePaths = Object.keys(liveMap);
  const writing = livePaths.filter((path) => !liveMap[path].done).pop() || livePaths[livePaths.length - 1] || '';
  const viewPath = busy ? (picked.current && selected ? selected : writing || selected) : selected;
  const exists = !!viewPath && (viewPath in files || viewPath in liveMap);
  const content = busy && viewPath in liveMap ? liveMap[viewPath].content : files[viewPath] ?? '';
  const colored = useMemo(() => (exists && !busy && !editing ? highlight(content) : ''), [exists, busy, editing, content]);

  useEffect(() => { if (busy) picked.current = false; }, [busy]);
  useEffect(() => { setEditing(false); setConfirm(false); }, [selected]);
  useEffect(() => { const el = scroller.current; if (busy && el) el.scrollTop = el.scrollHeight; }, [content, busy]);
  useEffect(() => { if (selected && paths.includes(selected)) setOpenTabs((current) => current.includes(selected) ? current : [...current, selected].slice(-6)); }, [selected, paths]);
  useEffect(() => { setOpenTabs((current) => current.filter((path) => paths.includes(path))); }, [paths]);
  useEffect(() => {
    if (filesOnly) { setTreeOpen(true); setShow('tree'); }
    else { setTreeOpen(false); setShow('view'); }
  }, [filesOnly]);
  useEffect(() => { lineGutter.current?.style.setProperty('--line-offset', '0px'); }, [viewPath, editing]);

  const choose = (path) => { if (busy) picked.current = true; onSelect(path); setShow('view'); };
  const showFiles = () => { setTreeOpen(true); setShow('tree'); };
  const hideFiles = () => { if (filesOnly) { onExitFilesOnly?.(); return; } setTreeOpen(false); setShow('view'); };
  const toggleAdd = (kind) => { setAdding(adding === kind ? '' : kind); setName(''); setMsg(''); };
  function submitAdd() {
    const value = name.trim().replace(/^\/+|\/+$/g, '');
    if (adding === 'file') {
      const path = cleanPath(value);
      if (!path) { setMsg('Use a name like css/theme.css'); return; }
      onCreate(path); setShow('view');
    } else {
      if (!FOLDER_RE.test(value)) { setMsg('Use a folder name like assets'); return; }
      onFolder(value);
    }
    setAdding(''); setName(''); setMsg('');
  }
  const save = () => { onSave(viewPath, draft); setEditing(false); };
  const onEditKey = (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
    if (event.key === 'Tab') {
      event.preventDefault();
      const target = event.target, start = target.selectionStart;
      setDraft(draft.slice(0, start) + '  ' + draft.slice(target.selectionEnd));
      requestAnimationFrame(() => { target.selectionStart = target.selectionEnd = start + 2; });
    }
  };
  const syncLineGutter = (event) => { lineGutter.current?.style.setProperty('--line-offset', `-${event.currentTarget.scrollTop}px`); };
  const fileStatus = (path) => modifiedSet.has(path) ? 'modified' : importedSet.has(path) ? 'imported' : marks?.[path] || '';

  const row = (path, depth) => {
    const kind = kindOf(path), state = liveMap[path], mark = marks && marks[path], status = fileStatus(path);
    return (
      <button key={path} className={'frow' + (path === viewPath ? ' sel' : '')} style={{ '--d': depth }} onClick={() => choose(path)} title={path}>
        <span className={'fi ' + kind.cls}>{kind.label}</span>
        <span className="fn">{path.split('/').pop()}</span>
        {busy && state ? (state.done ? <Check className="fdone" width="14" height="14" /> : <span className="fspin" />)
          : mark ? <i className={'fmark ' + mark} title={mark === 'new' ? 'New' : 'Edited'} /> : null}
        {status && <span className={'file-status-badge ' + status}>{status === 'imported' ? 'Imported' : status === 'modified' || status === 'edit' ? 'Edited' : 'New'}</span>}
      </button>
    );
  };
  const rows = (node, base, depth) => [
    ...Object.keys(node.dirs).sort().map((directory) => {
      const full = base + directory, shut = !!closed[full];
      return (
        <div key={'d:' + full}>
          <button className="frow" style={{ '--d': depth }} onClick={() => setClosed((current) => ({ ...current, [full]: !current[full] }))}>
            <Chevron className={'chev' + (shut ? '' : ' open')} width="14" height="14" /><Folder width="16" height="16" /><span className="fn">{directory}</span>
          </button>
          {!shut && rows(node.dirs[directory], full + '/', depth + 1)}
        </div>
      );
    }),
    ...node.files.slice().sort().map((path) => row(path, depth)),
  ];

  const activeContent = editing ? draft : content;
  const lines = activeContent ? activeContent.split('\n').length : 0;
  const lineNumbers = Array.from({ length: Math.max(1, lines) }, (_, index) => index + 1).join('\n');
  const displayedTabs = openTabs.filter((path) => paths.includes(path));

  return (
    <div className="explorer">
      <div className={'exin' + (treeOpen ? ' tree-open' : ' tree-closed') + (filesOnly ? ' files-only' : '')} data-show={show}>
        <aside className="ftree" hidden={!treeOpen}>
          <div className="fhead">
            <b>Files</b>
            <button className="iconbtn sm" onClick={hideFiles} aria-label={filesOnly ? 'Return to Code' : 'Hide file navigation'} title={filesOnly ? 'Return to Code' : 'Hide file navigation'}><ArrowLeft width="17" height="17" /></button>
            <button className={'iconbtn sm' + (adding === 'file' ? ' on' : '')} disabled={busy} onClick={() => toggleAdd('file')} aria-label="New file" title="New file"><FilePlus width="18" height="18" /></button>
            <button className={'iconbtn sm' + (adding === 'folder' ? ' on' : '')} disabled={busy} onClick={() => toggleAdd('folder')} aria-label="New folder" title="New folder"><FolderPlus width="18" height="18" /></button>
            <button className={'iconbtn sm' + (searching ? ' on' : '')} onClick={() => { setSearching(!searching); setQ(''); }} aria-label="Search files" title="Search files"><Search width="18" height="18" /></button>
          </div>
          {adding && <div className="fadd"><input autoFocus value={name} placeholder={adding === 'file' ? 'path/name.ext' : 'folder name'} aria-label={adding === 'file' ? 'New file path' : 'New folder name'} onChange={(event) => { setName(event.target.value); setMsg(''); }} onKeyDown={(event) => { if (event.key === 'Enter') submitAdd(); if (event.key === 'Escape') toggleAdd(adding); }} /><button className="iconbtn sm" onClick={submitAdd} aria-label="Create"><Check width="18" height="18" /></button></div>}
          {msg && <p className="fmsg">{msg}</p>}
          {searching && <div className="fadd"><input autoFocus value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search names and code" aria-label="Search files" /></div>}
          <div className="fscroll">
            {searching && q.trim() ? (results.length ? results.map((result) => <button key={result.path} className={'fres' + (result.path === viewPath ? ' sel' : '')} onClick={() => choose(result.path)}><span className="fn">{result.path}</span>{result.line && <em>{result.line}</em>}</button>) : <p className="fnone">No matches.</p>)
              : paths.length || dirs.length ? rows(tree, '', 0) : <p className="fnone">No files yet.</p>}
          </div>
        </aside>

        <section className="fview" hidden={filesOnly}>
          {exists ? (
            <>
              <div className="fvhead">
                <button className="file-nav-open" type="button" onClick={showFiles} aria-label="Browse project files" title="Browse project files"><FileIcon width="16" height="16" /><span>Files</span></button>
                <button className="iconbtn sm fback" onClick={showFiles} aria-label="Back to files"><ArrowLeft width="18" height="18" /></button>
                <span className="fvpath" title={viewPath}>{viewPath}</span>
                <span className="fvmeta">{lines} {lines === 1 ? 'line' : 'lines'}</span>
                {busy ? <span className="fvlive"><i />writing</span>
                  : confirm ? <span className="fvact"><span className="fvmeta">Delete?</span><button className="iconbtn sm" onClick={() => { onDelete(viewPath); setConfirm(false); }} aria-label="Confirm delete"><Check width="18" height="18" /></button><button className="iconbtn sm" onClick={() => setConfirm(false)} aria-label="Cancel delete"><Close width="18" height="18" /></button></span>
                    : editing ? <span className="fvact"><button className="primary sm" onClick={save}>Save</button><button className="sm" onClick={() => setEditing(false)}>Cancel</button></span>
                      : <span className="fvact"><button className="iconbtn sm" onClick={() => { setDraft(content); setEditing(true); }} aria-label="Edit file" title="Edit"><Edit width="18" height="18" /></button><button className="iconbtn sm" onClick={() => onCopy(content)} aria-label="Copy file" title="Copy"><Copy width="18" height="18" /></button><button className="iconbtn sm" onClick={() => setConfirm(true)} aria-label="Delete file" title="Delete"><Trash width="18" height="18" /></button></span>}
              </div>
              {displayedTabs.length > 0 && <div className="file-tab-strip" role="tablist" aria-label="Open files">{displayedTabs.map((path) => {
                const status = fileStatus(path);
                return <button key={path} type="button" role="tab" aria-selected={path === viewPath} className={'file-tab' + (path === viewPath ? ' active' : '')} onClick={() => choose(path)} title={path}><FileIcon width="14" height="14" /><span>{path.split('/').pop()}</span>{status && <i className={'file-tab-status ' + status} aria-label={status === 'modified' || status === 'edit' ? 'Edited' : status === 'imported' ? 'Imported from GitHub' : 'New file'} />}</button>;
              })}</div>}
              <div className="codewrap">
                {busy && <CodeRain />}
                {busy && <span className="wchip"><i /><WordCycle />…</span>}
                <div className="code-gutter" aria-hidden="true"><pre ref={lineGutter}>{lineNumbers}</pre></div>
                {editing ? <textarea className="editor" value={draft} spellCheck={false} onChange={(event) => setDraft(event.target.value)} onScroll={syncLineGutter} onKeyDown={onEditKey} aria-label={'Edit ' + viewPath} autoFocus />
                  : busy ? <pre className="code live" ref={scroller} onScroll={syncLineGutter}>{content}<span className="caret" /></pre>
                    : <pre className="code" onScroll={syncLineGutter}><code dangerouslySetInnerHTML={{ __html: colored }} /></pre>}
              </div>
            </>
          ) : <div className="fempty"><div className="fempty-bar"><button className="file-nav-open" type="button" onClick={showFiles} aria-label="Browse project files" title="Browse project files"><FileIcon width="16" height="16" /><span>Files</span></button></div>{busy && <CodeRain />}<div className="fempty-in"><span className="fempty-ico"><FileIcon width="22" height="22" /></span><b>{busy ? 'Waiting for the first file' : 'Select a file'}</b><span>{busy ? 'Files appear here as SYNTHCODE writes them.' : 'Show project files to browse, search or create a file.'}</span></div></div>}
        </section>
      </div>
    </div>
  );
}
