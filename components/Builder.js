'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { streamChat } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';
import Workflow from './Workflow';
import { CodeRain, AssemblingPreview, AssemblingOverlay, WordCycle } from './Working';
import { Monitor, Tablet, Phone, Download, Arrow, Plus, Stop, Globe, Build, Refresh, Open, Copy, Send, Close, Edit } from '../lib/icons';

const SYSTEM = `You are a web app builder. Reply with one short sentence, then ONE complete, self-contained HTML file in a single \`\`\`html code block.
Rules: inline all CSS and JS; no external images or build steps; CDN scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net; responsive; accessible; make it work, not just look good.
When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully, and make the controls actually work. Draw icons and pictures with inline SVG or CSS.
When a current file is provided, modify it and return the full updated file.`;
const IDEAS = ['Landing page for a coffee shop', 'Habit tracker with streaks', 'Pomodoro timer with sounds', 'Kanban board with drag and drop'];
const EDITS = ['Add dark mode', 'Make it mobile friendly', 'Add smooth animations', 'Improve the colors'];
const WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' };
const grab = (t) => { const m = t.match(/```html\s*([\s\S]*?)(```|$)/i); return m ? m[1] : ''; };

// Light syntax colouring for the finished code. Input is escaped first, so the output only ever contains our own spans.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOKENS = /(&lt;!--[\s\S]*?--&gt;)|(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(&lt;\/?[a-zA-Z][\w-]*|\/?&gt;)|(\b(?:const|let|var|function|return|if|else|for|while|new|class|async|await|true|false|null|undefined|this)\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|ms|s|%)?)/g;
function highlight(src) {
  return esc(src).replace(TOKENS, (m, c1, c2, c3, str, tag, kw) => `<span class="hl-${c1 || c2 || c3 ? 'c' : str ? 's' : tag ? 't' : kw ? 'k' : 'n'}">${m}</span>`);
}

export default function Builder({ seed }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);   // { text, n, status: building | done | stopped | failed }
  const [html, setHtml] = useState('');
  const [live, setLive] = useState('');
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
  const a = useAttach();
  const ctl = useRef(null);
  const wbox = useRef(null);
  const histEnd = useRef(null);
  const codeRef = useRef(null);
  const seeded = useRef(false);
  const skip = useRef(false);
  const okRef = useRef(false);
  const noteT = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };
  const codeHtml = useMemo(() => (html ? highlight(html) : ''), [html]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(noteT.current); }, []);
  useEffect(() => { const t = wbox.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [prompt]);
  useEffect(() => { histEnd.current?.scrollIntoView({ block: 'end' }); }, [history]);
  useEffect(() => { const el = codeRef.current; if (busy && el) el.scrollTop = el.scrollHeight; }, [live, busy, view]); // follow the code as it is written
  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; build(seed, true); } }, [seed]);
  useEffect(() => { if (!busy && queued && okRef.current) { const q = queued; setQueued(''); build(q); } }, [busy, queued]); // run the next request when this build finishes
  useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const flash = (m) => { setNote(m); clearTimeout(noteT.current); noteT.current = setTimeout(() => setNote(''), 2200); };

  async function build(override, instant) {
    const text = (override ?? prompt).trim();
    const imgs = a.images;
    if (!text && !imgs.length) return;
    if (busy) { setQueued(text || 'Build from the image'); setPrompt(''); return; } // the bar stays usable: this runs when the current build ends
    const first = history.length === 0 && !html;
    const logged = (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    skip.current = false; okRef.current = false;
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length, status: 'building' }]);
    setPrompt(''); a.clear(); setErr(''); setLastId(null); setLive(''); setBusy(true); setView('preview'); setPane('preview');
    if (first) {
      // Welcome screen fades out, then the build workspace fades in.
      if (instant) { setEntering(true); later(() => setEntering(false), 800); }
      else { setLeaving(true); later(() => { setLeaving(false); setEntering(true); later(() => setEntering(false), 800); }, 380); }
    }
    ctl.current = new AbortController();
    const system = SYSTEM + (html ? `\n\nCurrent file:\n${html.slice(0, 40000)}` : '');
    const user = [{ role: 'user', content: withImages(text, imgs, 'Build this.') }];
    const meta = {};
    const mark = (status) => setHistory((h) => h.map((x, i) => (i === h.length - 1 ? { ...x, status } : x)));
    try {
      let reply = await streamChat({ messages: user, system, mode: 'build' }, (t) => setLive(grab(t)), ctl.current.signal, meta);
      let out = grab(reply);
      let tid = meta.tid;
      if (!out) {
        // Formatting slip: count it against that model, then retry once on the next one.
        track({ mode: 'build', prompt: logged, reply: '[FORMAT] no html block', model: 'auto', tid: meta.tid, error: true });
        const meta2 = {};
        reply = await streamChat({ messages: user, system: system + '\n\nIMPORTANT: reply with one short sentence and then exactly one complete HTML file inside a single ```html fenced block.', mode: 'build', retry: true }, (t) => setLive(grab(t)), ctl.current.signal, meta2);
        out = grab(reply);
        tid = meta2.tid;
      }
      if (!out) throw new Error('SYNTHCODE could not produce a page this time. Please try again.');
      setHtml(out); mark('done'); okRef.current = true;
      setJustDone(true); later(() => setJustDone(false), 900);
      setBusy(false); // finished: stop the working animations right away, before the logging call returns
      setLastId(await track({ mode: 'build', prompt: logged, reply: out.slice(0, 400), model: 'auto', tid }));
    } catch (e) {
      if (skip.current) { setBusy(false); return; } // "New" was pressed while building
      setQueued('');
      const aborted = e.name === 'AbortError';
      if (!aborted) { setErr(e.message.slice(0, 400)); setPane('prompt'); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: 'auto', error: true }); }
      if (!html) { setHistory([]); setLive(''); setPrompt(text); setView('preview'); } // nothing built yet: back to the welcome screen
      else { mark(aborted ? 'stopped' : 'failed'); setLive(''); } // keep the last good page
    }
    setBusy(false);
  }

  const stop = () => { setQueued(''); ctl.current?.abort(); };

  function reset() {
    if (busy) { skip.current = true; ctl.current?.abort(); }
    setHtml(''); setLive(''); setHistory([]); setErr(''); setLastId(null); setPane('prompt'); setPrompt(''); setQueued(''); setBusy(false); setFull(false); setView('preview'); setJustDone(false);
    a.clear();
  }

  function download() {
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    l.download = 'index.html'; l.click();
  }
  const copy = async () => { try { await navigator.clipboard.writeText(html); flash('Code copied'); } catch { flash('Could not copy'); } };
  async function send() {
    const file = new File([html], 'index.html', { type: 'text/html' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Built with SYNTHCODE' });
      else { await navigator.clipboard.writeText(html); flash('Copied. File sharing is not supported here'); }
    } catch (e) { if (e.name !== 'AbortError') flash('Could not share'); }
  }

  const welcome = (history.length === 0 && !html) || leaving; // default state until a build has started

  const pick = (t) => {
    setPrompt(t);
    setTimeout(() => { const b = wbox.current; if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0);
  };
  const last = history[history.length - 1];

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
          <span className={'status' + (busy ? ' busy' : html ? ' done' : '')}><i />{busy ? 'Building…' : html ? 'Ready' : 'Idle'}</span>
        </div>
        <div className="hist">
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
              <div className="lr-foot">
                <span className={'lr-st ' + last.status}>
                  {last.status === 'building' ? <><span className="typing" role="status" aria-label="Building"><i /><i /><i /></span>Building</>
                    : last.status === 'failed' ? 'Could not finish'
                    : last.status === 'stopped' ? 'Stopped'
                    : 'Done, preview updated'}
                </span>
                <span className="grow" />
                <button className="linkbtn" onClick={() => pick(last.text)} disabled={busy}><Edit width="14" height="14" /> Edit</button>
                {(last.status === 'failed' || last.status === 'stopped') && <button className="linkbtn" onClick={() => build(last.text)} disabled={busy}><Refresh width="14" height="14" /> Retry</button>}
              </div>
            </div>
          )}
          <div ref={histEnd} />
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        {queued && <div className="queued"><span>Queued next: {queued}</span><button className="linkbtn" onClick={() => setQueued('')}>Cancel</button></div>}
        {html && <div className="editchips">{EDITS.map((t) => <button key={t} className="chip" onClick={() => pick(t)}>{t}</button>)}</div>}
        <Thumbs a={a} />
        <div className="compose col">
          <div className="pbar-head"><i />prompt<span className="grow" /><span>{busy ? 'new requests are queued' : 'Enter to build'}</span></div>
          <textarea ref={wbox} value={prompt} rows={3} aria-label="Describe what to build or change"
            placeholder={busy ? 'Type your next request. It runs when this build finishes.' : html ? 'Ask for a change' : 'Describe what to build'}
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
            {busy && <span className="busytag"><i /><WordCycle />…</span>}
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
            <button className="iconbtn sm act-opt" disabled={!html} onClick={copy} aria-label="Copy code" title="Copy code"><Copy /></button>
            <button className="iconbtn sm" disabled={!html} onClick={download} aria-label="Download HTML" title="Download HTML"><Download /></button>
            <button className="iconbtn sm" disabled={!html} onClick={send} aria-label="Share" title="Share"><Send /></button>
          </div>
        </div>

        {/* Both tabs stay mounted so the preview keeps its state when you look at the code and back. */}
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
          <div className="codewrap">
            {busy && <CodeRain />}
            {busy && <span className="wchip"><i /><WordCycle />…</span>}
            {busy
              ? <pre className="code live" ref={codeRef}>{live}<span className="caret" /></pre>
              : <pre className="code" ref={codeRef}>{html ? <code dangerouslySetInnerHTML={{ __html: codeHtml }} /> : <span className="muted">No code yet.</span>}</pre>}
          </div>
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
