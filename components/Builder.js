'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { streamChat, applyToolEvent } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useFollow } from '../lib/follow';
import { parseFiles, mergeFiles, entryOf, bundle, filesForPrompt, makeZip } from '../lib/files';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';
import ToolRuns from './ToolRuns';
import Workflow from './Workflow';
import FileExplorer from './FileExplorer';
import { AssemblingPreview, AssemblingOverlay, WordCycle } from './Working';
import { Monitor, Tablet, Phone, Download, Arrow, ArrowDown, Plus, Stop, Globe, Build, Refresh, Open, Copy, Send, Close, Edit } from '../lib/icons';

const SYSTEM = `You are SYNTHCODE, a coding agent that builds small web apps as a project of files.
Reply with one short sentence, then every file you create or change, each in its own fenced code block with the path on the opening line:
\`\`\`html file=index.html
...
\`\`\`
\`\`\`css file=styles.css
...
\`\`\`
\`\`\`js file=script.js
...
\`\`\`
Rules:
- The page is index.html. Use plain HTML, CSS and JavaScript with no build step, no modules or imports, and no external images. Link files with relative paths: <link rel="stylesheet" href="styles.css"> and <script src="script.js"></script>. CDN scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net.
- Keep it small: usually index.html, styles.css and script.js. The preview has no server, so never fetch() project files; put data in script.js.
- Responsive, accessible, and it must actually work.
- When files already exist (listed below), return only the files you change or add, each with its COMPLETE new contents. To remove a file, add a block that starts with \`\`\`delete and lists the path on its own line.
- When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully and make the controls work. Draw icons and pictures with inline SVG or CSS.`;
const IDEAS = ['Landing page for a coffee shop', 'Habit tracker with streaks', 'Pomodoro timer with sounds', 'Kanban board with drag and drop'];
const EDITS = ['Add dark mode', 'Make it mobile friendly', 'Add smooth animations', 'Improve the colors'];
const WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' };
// A reply that changes nothing, or leaves the project without a page, counts as a formatting slip.
const slipped = (parsed, merged) => (!parsed.files.length && !parsed.deletes.length) || !entryOf(merged.files);
const SYMBOL = { new: '+', edit: '~', del: '−' };

export default function Builder({ seed }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);   // { text, n, status: building | done | stopped | failed, changed: [{ path, kind }] }
  const [files, setFiles] = useState({});       // the project: { 'index.html': '...', 'css/theme.css': '...' }
  const [dirs, setDirs] = useState([]);         // empty folders the user created
  const [selected, setSelected] = useState(''); // file open in the Code tab
  const [marks, setMarks] = useState({});       // what the last build added or edited
  const [live, setLive] = useState('');         // raw agent reply while it streams
  const [view, setView] = useState('preview');
  const [pane, setPane] = useState('prompt');
  const [dev, setDev] = useState('desktop');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastId, setLastId] = useState(null);
  const [leaving, setLeaving] = useState(false);   // welcome screen fading out
  const [entering, setEntering] = useState(false); // build workspace fading in
  const [justDone, setJustDone] = useState(false); // real preview revealing after a build
  const [queued, setQueued] = useState('');        // request typed while a build is running
  const [frame, setFrame] = useState(0);
  const [full, setFull] = useState(false);
  const [note, setNote] = useState('');
  const [tools, setTools] = useState([]);      // tools the agent is using or used for this request
  const a = useAttach();
  const ctl = useRef(null);
  const wbox = useRef(null);
  const seeded = useRef(false);
  const skip = useRef(false);
  const okRef = useRef(false);
  const toolsRef = useRef([]);
  const noteT = useRef(null);
  const timers = useRef([]);
  const histFollow = useFollow(history);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const html = useMemo(() => bundle(files), [files]); // one self-contained page for the sandboxed preview
  const hasFiles = Object.keys(files).length > 0;
  const liveMap = useMemo(() => {
    if (!busy) return null;
    const o = {};
    parseFiles(live).files.forEach((f) => { o[f.path] = { content: f.content, done: f.done }; });
    return o;
  }, [busy, live]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(noteT.current); }, []);
  useEffect(() => { const t = wbox.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [prompt]);
  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; build(seed, true); } }, [seed]);
  useEffect(() => { if (!busy && queued && okRef.current) { const q = queued; setQueued(''); build(q); } }, [busy, queued]); // run the next request when this build finishes
  useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const onTool = (ev) => { toolsRef.current = applyToolEvent(toolsRef.current, ev); setTools(toolsRef.current); };
  const flash = (m) => { setNote(m); clearTimeout(noteT.current); noteT.current = setTimeout(() => setNote(''), 2200); };
  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); flash('Copied'); } catch { flash('Could not copy'); } };

  async function build(override, instant) {
    const text = (override ?? prompt).trim();
    const imgs = a.images;
    if (!text && !imgs.length) return;
    if (busy) { setQueued(text || 'Build from the image'); setPrompt(''); return; } // the bar stays usable: this runs when the current build ends
    const first = history.length === 0 && !hasFiles;
    const logged = (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    skip.current = false; okRef.current = false;
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length, status: 'building' }]);
    setPrompt(''); a.clear(); setErr(''); setLastId(null); setLive(''); setMarks({}); toolsRef.current = []; setTools([]); setBusy(true); setView('preview'); setPane('preview');
    if (first) {
      // Welcome screen fades out, then the build workspace fades in.
      if (instant) { setEntering(true); later(() => setEntering(false), 800); }
      else { setLeaving(true); later(() => { setLeaving(false); setEntering(true); later(() => setEntering(false), 800); }, 380); }
    }
    ctl.current = new AbortController();
    const system = SYSTEM + (hasFiles ? `\n\nCurrent files:\n${filesForPrompt(files, selected)}` : '');
    const user = [{ role: 'user', content: withImages(text, imgs, 'Build this.') }];
    const meta = {};
    const mark = (status, changed) => { const used = toolsRef.current; setHistory((h) => h.map((x, i) => (i === h.length - 1 ? { ...x, status, tools: used, ...(changed ? { changed } : {}) } : x))); };
    try {
      let reply = await streamChat({ messages: user, system, mode: 'build' }, setLive, ctl.current.signal, meta, onTool);
      let parsed = parseFiles(reply);
      let merged = mergeFiles(files, parsed);
      let tid = meta.tid;
      if (slipped(parsed, merged)) {
        // Formatting slip: count it against that model, then retry once on the next one.
        track({ mode: 'build', prompt: logged, reply: '[FORMAT] no usable files', model: 'auto', tid: meta.tid, error: true });
        const meta2 = {};
        reply = await streamChat({ messages: user, system: system + '\n\nIMPORTANT: reply with one short sentence, then every file in its own fenced code block with the path on the opening line (for example ```html file=index.html). The project must include index.html.', mode: 'build', retry: true }, setLive, ctl.current.signal, meta2, onTool);
        parsed = parseFiles(reply);
        merged = mergeFiles(files, parsed);
        tid = meta2.tid;
      }
      if (slipped(parsed, merged)) throw new Error('SYNTHCODE could not produce a page this time. Please try again.');
      setFiles(merged.files);
      setMarks(Object.fromEntries(merged.changed.filter((c) => c.kind !== 'del').map((c) => [c.path, c.kind])));
      setSelected((s) => (s && s in merged.files ? s : entryOf(merged.files)));
      mark('done', merged.changed); okRef.current = true;
      setJustDone(true); later(() => setJustDone(false), 900);
      setBusy(false); // finished: stop the working animations right away, before the logging call returns
      setLastId(await track({ mode: 'build', prompt: logged, reply: `[files ${parsed.files.map((f) => f.path).join(', ')}] ` + (parsed.files[0]?.content || '').slice(0, 250), model: 'auto', tid }));
    } catch (e) {
      if (skip.current) { setBusy(false); return; } // "New" was pressed while building
      setQueued('');
      const aborted = e.name === 'AbortError';
      if (!aborted) { setErr(e.message.slice(0, 400)); setPane('prompt'); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: 'auto', error: true }); }
      if (!hasFiles) { setHistory([]); setLive(''); setPrompt(text); setView('preview'); } // nothing built yet: back to the welcome screen
      else { mark(aborted ? 'stopped' : 'failed'); setLive(''); } // keep the last good project
    }
    setBusy(false);
  }

  const stop = () => { setQueued(''); ctl.current?.abort(); };

  function reset() {
    if (busy) { skip.current = true; ctl.current?.abort(); }
    setFiles({}); setDirs([]); setSelected(''); setMarks({}); toolsRef.current = []; setTools([]); setLive(''); setHistory([]); setErr(''); setLastId(null); setPane('prompt'); setPrompt(''); setQueued(''); setBusy(false); setFull(false); setView('preview'); setJustDone(false);
    a.clear();
  }

  // The user's own file operations in the Code tab. The agent sees these changes on the next request.
  const saveFile = (p, c) => { setFiles((f) => ({ ...f, [p]: c })); flash('Saved ' + p); };
  const createFile = (p) => { if (!(p in files)) setFiles((f) => ({ ...f, [p]: '' })); setSelected(p); };
  const createFolder = (p) => setDirs((d) => (d.includes(p) ? d : [...d, p]));
  const deleteFile = (p) => { setFiles((f) => { const n = { ...f }; delete n[p]; return n; }); setSelected((s) => (s === p ? '' : s)); flash('Deleted ' + p); };
  const openFile = (p) => { setSelected(p); setView('code'); };

  // Several files download as a .zip, a single file as itself.
  function packaged() {
    const names = Object.keys(files);
    return names.length > 1
      ? { blob: new Blob([makeZip(files)], { type: 'application/zip' }), name: 'synthcode-project.zip' }
      : { blob: new Blob([files[names[0]] || ''], { type: 'text/plain' }), name: names[0] || 'index.html' };
  }
  function download() {
    const { blob, name } = packaged();
    const l = document.createElement('a');
    l.href = URL.createObjectURL(blob);
    l.download = name; l.click();
    setTimeout(() => URL.revokeObjectURL(l.href), 4000);
  }
  async function send() {
    const { blob, name } = packaged();
    const file = new File([blob], name, { type: blob.type });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Built with SYNTHCODE' });
      else { await navigator.clipboard.writeText(files[selected] ?? files[entryOf(files)] ?? ''); flash('Copied the open file. File sharing is not supported here'); }
    } catch (e) { if (e.name !== 'AbortError') flash('Could not share'); }
  }

  const welcome = (history.length === 0 && !hasFiles) || leaving; // default state until a build has started

  const pick = (t) => {
    setPrompt(t);
    setTimeout(() => { const b = wbox.current; if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0);
  };
  const last = history[history.length - 1];
  const using = tools.find((t) => t.state === 'running');

  if (welcome) {
    return (
      <section className={'bw' + (leaving ? ' leaving' : '')} {...a.dropProps}>
        <div className="bw-scroll">
          <div className="bw-hero">
            <img className="bw-mark" src="/logo-mark.png" alt="" />
            <h2>Build anything with SYNTHCODE</h2>
            <p>Describe an app or page, or add a screenshot or sketch to recreate. Then keep asking for changes.</p>
            <div className="bw-pills">
              {IDEAS.map((t, i) => <button key={t} className="bw-pill" style={{ '--i': i }} onClick={() => pick(t)}>{t}</button>)}
            </div>
          </div>
          <Workflow />
        </div>
        <div className="bw-dock">
          {err && <p className="err" role="alert">{err}</p>}
          <Thumbs a={a} />
          <div className="compose">
            <AttachButton a={a} />
            <textarea ref={wbox} value={prompt} rows={1} placeholder="Describe the app or page you want, or paste a screenshot" aria-label="Describe what to build"
              onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
            <button className="primary glow buildbtn" onClick={() => build()} disabled={!prompt.trim() && !a.images.length}>Build <Arrow /></button>
          </div>
          <p className="tools"><span>Enter to build, Shift+Enter for a new line. You can also paste or drop an image.</span></p>
        </div>
      </section>
    );
  }

  return (
    <section className={'build' + (entering ? ' enter' : '')} data-pane={pane} {...a.dropProps}>
      <div className="seg" role="tablist">
        <button className={pane === 'prompt' ? 'on' : ''} onClick={() => setPane('prompt')}>Describe</button>
        <button className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>Preview</button>
      </div>

      <aside className="panel">
        <div className="phead">
          <div><small>Project</small><b title={history[0]?.text}>{history[0]?.text || 'Untitled'}</b></div>
          <span className={'status' + (busy ? ' busy' : hasFiles ? ' done' : '')}><i />{busy ? 'Building…' : hasFiles ? 'Ready' : 'Idle'}</span>
        </div>
        <div className="histwrap">
          <div className="hist" ref={histFollow.ref} onScroll={histFollow.onScroll}>
            {history.length > 1 && (
              <details className="earlier">
                <summary>Earlier requests ({history.length - 1})</summary>
                {history.slice(0, -1).map((h, i) => (
                  <button key={i} className="eprev" onClick={() => pick(h.text)} title="Use this request as a starting point"><i className={'sdot ' + h.status} />{h.text}</button>
                ))}
              </details>
            )}
            {last && (
              <div className="lastreq">
                <small>Last request</small>
                <p>{last.text}{last.n > 0 && ` (+${last.n} image${last.n > 1 ? 's' : ''})`}</p>
                <ToolRuns tools={last.status === 'building' ? tools : last.tools} compact />
                {last.changed && last.changed.length > 0 && (
                  <div className="lr-files" aria-label="Files changed by this request">
                    {last.changed.slice(0, 8).map((c) => (
                      <button key={c.path} className={'fchip ' + c.kind} disabled={c.kind === 'del'} onClick={() => openFile(c.path)} title={c.kind === 'new' ? 'Created' : c.kind === 'edit' ? 'Edited' : 'Deleted'}><i>{SYMBOL[c.kind]}</i><span>{c.path}</span></button>
                    ))}
                    {last.changed.length > 8 && <span className="fmore">+{last.changed.length - 8} more</span>}
                  </div>
                )}
                <div className="lr-foot">
                  <span className={'lr-st ' + last.status}>
                    {last.status === 'building' ? <><span className="typing" role="status" aria-label="Building"><i /><i /><i /></span>Building</>
                      : last.status === 'failed' ? 'Could not finish'
                      : last.status === 'stopped' ? 'Stopped'
                      : last.changed && last.changed.length === 0 ? 'Done, nothing needed changing'
                      : 'Done, project updated'}
                  </span>
                  <span className="grow" />
                  <button className="linkbtn" onClick={() => pick(last.text)} disabled={busy}><Edit width="14" height="14" /> Edit</button>
                  {(last.status === 'failed' || last.status === 'stopped') && <button className="linkbtn" onClick={() => build(last.text)} disabled={busy}><Refresh width="14" height="14" /> Retry</button>}
                </div>
              </div>
            )}
          </div>
          {histFollow.away && <button className={'godown' + (busy ? ' live' : '')} onClick={() => histFollow.down()} aria-label="Scroll to latest"><ArrowDown width="18" height="18" /></button>}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        {queued && <div className="queued"><span>Queued next: {queued}</span><button className="linkbtn" onClick={() => setQueued('')}>Cancel</button></div>}
        {hasFiles && <div className="editchips">{EDITS.map((t) => <button key={t} className="chip" onClick={() => pick(t)}>{t}</button>)}</div>}
        <Thumbs a={a} />
        <div className="compose col">
          <div className="pbar-head"><i />prompt<span className="grow" /><span>{busy ? 'new requests are queued' : 'Enter to build'}</span></div>
          <textarea ref={wbox} value={prompt} rows={3} aria-label="Describe what to build or change"
            placeholder={busy ? 'Type your next request. It runs when this build finishes.' : hasFiles ? 'Ask for a change' : 'Describe what to build'}
            onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
          <div className="row">
            <AttachButton a={a} />
            <button onClick={reset}><Plus width="16" height="16" /> New</button>
            <span className="grow" />
            {busy && <button className="stopbtn" onClick={stop}><Stop width="16" height="16" /> Stop</button>}
            <button className="primary glow" onClick={() => build()} disabled={!prompt.trim() && !a.images.length}>{busy ? 'Queue' : 'Build'}</button>
          </div>
        </div>
        {lastId && <Rate id={lastId} />}
      </aside>

      <div className="stage panel">
        <div className="stagebar">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}><Globe width="16" height="16" />Preview</button>
            <button role="tab" aria-selected={view === 'code'} className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}><Build width="16" height="16" />Code</button>
            {busy && <span className="busytag"><i />{using ? 'using ' + using.label : <WordCycle />}…</span>}
          </div>
          <div className="actions" role="toolbar" aria-label="Page actions">
            <div className="devs">
              {[['desktop', Monitor], ['tablet', Tablet], ['phone', Phone]].map(([k, Ic]) => (
                <button key={k} className={'iconbtn sm' + (dev === k ? ' on' : '')} onClick={() => setDev(k)} aria-label={k + ' width'} title={k}><Ic /></button>
              ))}
            </div>
            <span className="sep" />
            <button className="iconbtn sm act-opt" disabled={!html} onClick={() => setFrame((n) => n + 1)} aria-label="Refresh preview" title="Refresh preview"><Refresh /></button>
            <button className="iconbtn sm" disabled={!html} onClick={() => setFull(true)} aria-label="Open full screen" title="Open full screen"><Open /></button>
            <button className="iconbtn sm act-opt" disabled={!hasFiles} onClick={() => copyText(files[selected] ?? files[entryOf(files)] ?? '')} aria-label="Copy open file" title="Copy open file"><Copy /></button>
            <button className="iconbtn sm" disabled={!hasFiles} onClick={download} aria-label="Download project" title="Download project"><Download /></button>
            <button className="iconbtn sm" disabled={!hasFiles} onClick={send} aria-label="Share project" title="Share project"><Send /></button>
          </div>
        </div>

        {/* Both tabs stay mounted so the preview keeps its state when you look at the files and back. */}
        <div className="pane" hidden={view !== 'preview'}>
          {html
            ? (
              <div className={'canvas' + (justDone ? ' reveal' : '') + (busy ? ' updating' : '')}>
                <iframe key={frame} title="Preview" style={{ width: WIDTH[dev] }} sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} />
                {busy && <AssemblingOverlay />}
              </div>
            )
            : busy
              ? <AssemblingPreview lines={live ? live.split('\n').length : 0} width={WIDTH[dev]} />
              : <p className="empty">Your app appears here.</p>}
        </div>
        <div className="pane" hidden={view !== 'code'}>
          <FileExplorer files={files} dirs={dirs} selected={selected} onSelect={setSelected} onSave={saveFile} onCreate={createFile} onFolder={createFolder} onDelete={deleteFile} onCopy={copyText} busy={busy} live={liveMap} marks={marks} />
        </div>
        {note && <div className="toast" role="status">{note}</div>}
      </div>

      {full && (
        <div className="fs" role="dialog" aria-label="Full screen preview">
          <div className="fsbar"><span>Full screen preview</span><button className="iconbtn sm" onClick={() => setFull(false)} aria-label="Close full screen"><Close /></button></div>
          <iframe title="Full screen preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} />
        </div>
      )}
    </section>
  );
}
