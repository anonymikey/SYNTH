'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CodeRain, WordCycle } from './Working';
import { FilePlus, FolderPlus, Search, Chevron, Folder, Trash, Check, Close, Edit, Copy, ArrowLeft, FileIcon } from '../lib/icons';
import { kindOf, buildTree, highlight, searchFiles, cleanPath } from '../lib/files';

const FOLDER_RE = /^[\w@.\-]+(?:\/[\w@.\-]+)*$/;

// The Code tab: a file tree on the left, the open file on the right. Files the agent is writing appear live.
// live: { path: { content, done } } while a build is running, otherwise null.
export default function FileExplorer({ files, dirs, selected, onSelect, onSave, onCreate, onFolder, onDelete, onCopy, busy, live, marks }) {
  const [adding, setAdding] = useState('');      // '' | 'file' | 'folder'
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [closed, setClosed] = useState({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [show, setShow] = useState('tree');      // narrow screens: which pane is visible
  const picked = useRef(false);                  // the user chose a file while the agent was writing
  const scroller = useRef(null);

  const liveMap = live || {};
  const paths = useMemo(() => [...new Set([...Object.keys(files), ...Object.keys(liveMap)])].sort(), [files, live]);
  const tree = useMemo(() => buildTree(paths, dirs), [paths, dirs]);
  const results = useMemo(() => (searching && q.trim() ? searchFiles(files, q.trim()) : []), [searching, q, files]);

  const livePaths = Object.keys(liveMap);
  const writing = livePaths.filter((p) => !liveMap[p].done).pop() || livePaths[livePaths.length - 1] || '';
  const viewPath = busy ? (picked.current && selected ? selected : writing || selected) : selected;
  const exists = !!viewPath && (viewPath in files || viewPath in liveMap);
  const content = busy && viewPath in liveMap ? liveMap[viewPath].content : files[viewPath] ?? '';
  const colored = useMemo(() => (exists && !busy && !editing ? highlight(content) : ''), [exists, busy, editing, content]);

  useEffect(() => { if (busy) picked.current = false; }, [busy]);
  useEffect(() => { setEditing(false); setConfirm(false); }, [selected]);
  useEffect(() => { const el = scroller.current; if (busy && el) el.scrollTop = el.scrollHeight; }, [content, busy]); // follow the file being written

  const choose = (p) => { if (busy) picked.current = true; onSelect(p); setShow('view'); };
  const toggleAdd = (kind) => { setAdding(adding === kind ? '' : kind); setName(''); setMsg(''); };
  function submitAdd() {
    const v = name.trim().replace(/^\/+|\/+$/g, '');
    if (adding === 'file') {
      const p = cleanPath(v);
      if (!p) { setMsg('Use a name like css/theme.css'); return; }
      onCreate(p); setShow('view');
    } else {
      if (!FOLDER_RE.test(v)) { setMsg('Use a folder name like assets'); return; }
      onFolder(v);
    }
    setAdding(''); setName(''); setMsg('');
  }
  const save = () => { onSave(viewPath, draft); setEditing(false); };
  const onEditKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; setDraft(draft.slice(0, s) + '  ' + draft.slice(t.selectionEnd)); requestAnimationFrame(() => { t.selectionStart = t.selectionEnd = s + 2; }); }
  };

  const row = (p, depth) => {
    const k = kindOf(p), st = liveMap[p], mark = marks && marks[p];
    return (
      <button key={p} className={'frow' + (p === viewPath ? ' sel' : '')} style={{ '--d': depth }} onClick={() => choose(p)} title={p}>
        <span className={'fi ' + k.cls}>{k.label}</span>
        <span className="fn">{p.split('/').pop()}</span>
        {busy && st ? (st.done ? <Check className="fdone" width="14" height="14" /> : <span className="fspin" />)
          : mark ? <i className={'fmark ' + mark} title={mark === 'new' ? 'New' : 'Edited'} /> : null}
      </button>
    );
  };
  const rows = (node, base, depth) => [
    ...Object.keys(node.dirs).sort().map((d) => {
      const full = base + d, shut = !!closed[full];
      return (
        <div key={'d:' + full}>
          <button className="frow" style={{ '--d': depth }} onClick={() => setClosed((c) => ({ ...c, [full]: !c[full] }))}>
            <Chevron className={'chev' + (shut ? '' : ' open')} width="14" height="14" /><Folder width="16" height="16" /><span className="fn">{d}</span>
          </button>
          {!shut && rows(node.dirs[d], full + '/', depth + 1)}
        </div>
      );
    }),
    ...node.files.slice().sort().map((p) => row(p, depth)),
  ];

  const lines = content ? content.split('\n').length : 0;
  return (
    <div className="explorer">
      <div className="exin" data-show={show}>
        <aside className="ftree">
          <div className="fhead">
            <b>Files</b>
            <button className={'iconbtn sm' + (adding === 'file' ? ' on' : '')} disabled={busy} onClick={() => toggleAdd('file')} aria-label="New file" title="New file"><FilePlus width="18" height="18" /></button>
            <button className={'iconbtn sm' + (adding === 'folder' ? ' on' : '')} disabled={busy} onClick={() => toggleAdd('folder')} aria-label="New folder" title="New folder"><FolderPlus width="18" height="18" /></button>
            <button className={'iconbtn sm' + (searching ? ' on' : '')} onClick={() => { setSearching(!searching); setQ(''); }} aria-label="Search files" title="Search files"><Search width="18" height="18" /></button>
          </div>
          {adding && (
            <div className="fadd">
              <input autoFocus value={name} placeholder={adding === 'file' ? 'path/name.ext' : 'folder name'} aria-label={adding === 'file' ? 'New file path' : 'New folder name'}
                onChange={(e) => { setName(e.target.value); setMsg(''); }}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); if (e.key === 'Escape') toggleAdd(adding); }} />
              <button className="iconbtn sm" onClick={submitAdd} aria-label="Create"><Check width="18" height="18" /></button>
            </div>
          )}
          {msg && <p className="fmsg">{msg}</p>}
          {searching && (
            <div className="fadd"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search names and code" aria-label="Search files" /></div>
          )}
          <div className="fscroll">
            {searching && q.trim() ? (
              results.length
                ? results.map((r) => (
                  <button key={r.path} className={'fres' + (r.path === viewPath ? ' sel' : '')} onClick={() => choose(r.path)}>
                    <span className="fn">{r.path}</span>{r.line && <em>{r.line}</em>}
                  </button>
                ))
                : <p className="fnone">No matches.</p>
            ) : paths.length || dirs.length ? rows(tree, '', 0) : <p className="fnone">No files yet.</p>}
          </div>
        </aside>

        <section className="fview">
          {exists ? (
            <>
              <div className="fvhead">
                <button className="iconbtn sm fback" onClick={() => setShow('tree')} aria-label="Back to files"><ArrowLeft width="18" height="18" /></button>
                <span className="fvpath" title={viewPath}>{viewPath}</span>
                <span className="fvmeta">{lines} {lines === 1 ? 'line' : 'lines'}</span>
                {busy ? <span className="fvlive"><i />writing</span>
                  : confirm ? (
                    <span className="fvact">
                      <span className="fvmeta">Delete?</span>
                      <button className="iconbtn sm" onClick={() => { onDelete(viewPath); setConfirm(false); }} aria-label="Confirm delete"><Check width="18" height="18" /></button>
                      <button className="iconbtn sm" onClick={() => setConfirm(false)} aria-label="Cancel delete"><Close width="18" height="18" /></button>
                    </span>
                  ) : editing ? (
                    <span className="fvact">
                      <button className="primary sm" onClick={save}>Save</button>
                      <button className="sm" onClick={() => setEditing(false)}>Cancel</button>
                    </span>
                  ) : (
                    <span className="fvact">
                      <button className="iconbtn sm" onClick={() => { setDraft(content); setEditing(true); }} aria-label="Edit file" title="Edit"><Edit width="18" height="18" /></button>
                      <button className="iconbtn sm" onClick={() => onCopy(content)} aria-label="Copy file" title="Copy"><Copy width="18" height="18" /></button>
                      <button className="iconbtn sm" onClick={() => setConfirm(true)} aria-label="Delete file" title="Delete"><Trash width="18" height="18" /></button>
                    </span>
                  )}
              </div>
              <div className="codewrap">
                {busy && <CodeRain />}
                {busy && <span className="wchip"><i /><WordCycle />…</span>}
                {editing
                  ? <textarea className="editor" value={draft} spellCheck={false} onChange={(e) => setDraft(e.target.value)} onKeyDown={onEditKey} aria-label={'Edit ' + viewPath} autoFocus />
                  : busy ? <pre className="code live" ref={scroller}>{content}<span className="caret" /></pre>
                    : <pre className="code"><code dangerouslySetInnerHTML={{ __html: colored }} /></pre>}
              </div>
            </>
          ) : (
            <div className="fempty">
              {busy && <CodeRain />}
              <div className="fempty-in">
                <span className="fempty-ico"><FileIcon width="22" height="22" /></span>
                <b>{busy ? 'Waiting for the first file' : 'Select a file'}</b>
                <span>{busy ? 'Files appear here as SYNTHCODE writes them.' : 'Choose a file from the tree to view its contents.'}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
