'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { streamChat, applyToolEvent } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useFollow } from '../lib/follow';
import { parseFiles, mergeFiles, entryOf, bundle, filesForPrompt, makeZip, typescriptFiles, typescriptEntry } from '../lib/files';
import { SOURCE_ONLY_NOTICE, autoProjectPrompt, autoProjectRetry, isSourceOnlyLanguage, languageLabel, languageStatus, normalizeLanguagePreference, resolveProjectMode, sourceProjectEntry, sourceProjectIssue, sourceProjectPrompt, sourceProjectRetry, stripProjectModeMarker } from '../lib/project-languages';
import { compileTypeScript } from '../lib/typescript-client';
import { useAttach, Thumbs, AttachButton } from './Attach';
import VoiceInput from './VoiceInput';
import ResponseToolbar from './ResponseToolbar';
import Markdown from './Markdown';
import ToolRuns from './ToolRuns';
import SourcesDisclosure from './SourcePreview';
import NotificationSetupBanner from './NotificationSetupBanner';
import Workflow from './Workflow';
import FileExplorer from './FileExplorer';
import BuilderLanguageSettings, { LanguageSettingsButton } from './BuilderLanguageSettings';
import { AssemblingPreview, AssemblingOverlay, WordCycle } from './Working';
import { Monitor, Tablet, Phone, Download, Arrow, ArrowDown, Plus, Stop, Globe, Build, Refresh, Open, Copy, Send, Close, Edit } from '../lib/icons';
import { safeFrontendText } from '../lib/brand-view.js';
import { reportTaskNotification } from '../lib/notifications';

const sourcesFromTools = (toolRuns) => (Array.isArray(toolRuns) ? toolRuns : []).flatMap((tool) => Array.isArray(tool?.sources) ? tool.sources : []);

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
- The page is index.html. Use plain HTML, CSS and JavaScript with no build step, no modules or imports, and no external images. Link files with relative paths: <link rel="stylesheet" href="styles.css"> and <script src="script.js"></script>. Use a reputable public CDN only if an external script is essential; prefer a simple local implementation when feasible.
- Keep it small: usually index.html, styles.css and script.js. The preview has no server, so never fetch() project files; put data in script.js.
- Responsive, accessible, and it must actually work.
- When files already exist (listed below), return only the files you change or add, each with its COMPLETE new contents. To remove a file, add a block that starts with \`\`\`delete and lists the path on its own line.
- When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully and make the controls work. Draw icons and pictures with inline SVG or CSS.`;
const TYPESCRIPT_SYSTEM = `You are SYNTHCODE, a coding agent that builds small browser web apps as a project of files.
Reply with one short sentence, then every file you create or change, each in its own fenced code block with the path on the opening line:
\`\`\`html file=index.html
...
\`\`\`
\`\`\`css file=styles.css
...
\`\`\`
\`\`\`ts file=script.ts
...
\`\`\`
Rules:
- Build a browser app with index.html, optional styles.css, and exactly one plain TypeScript source file named script.ts. The preview compiles script.ts to browser JavaScript automatically.
- Link styles.css from index.html when used. Reference the compiled runtime as <script src="script.js"></script>; SYNTHCODE supplies that file for preview and project export.
- Use standard TypeScript syntax and browser DOM APIs. Do not use JSX/TSX, npm packages, import/export statements, Node.js APIs, or a server/build configuration. Keep all application logic in script.ts.
- The preview is a browser-only sandbox with no server. Do not fetch() project files; put data in script.ts. Do not rely on external images or libraries.
- Keep the app responsive, accessible, and functional.
- When files already exist (listed below), return only the files you change or add, each with its COMPLETE new contents. To remove a file, add a block that starts with \`\`\`delete and lists the path on its own line.
- When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully and make the controls work. Draw icons and pictures with inline SVG or CSS.`;
const IDEAS = ['Landing page for a coffee shop', 'Habit tracker with streaks', 'Pomodoro timer with sounds', 'Kanban board with drag and drop'];
const EDITS = ['Add dark mode', 'Make it mobile friendly', 'Add smooth animations', 'Improve the colors'];
const WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' };
const LANGUAGE_PREFERENCE_KEY = 'synthcode-language-preference-v1';
const entryFor = (files, language) => isSourceOnlyLanguage(language) ? sourceProjectEntry(files, language) : entryOf(files);
function projectIssue(files, language) {
  if (language === 'auto') return 'Choose one supported project mode and include its required files.';
  if (language === 'typescript') {
    if (!entryOf(files)) return 'Include an HTML page such as index.html.';
    if (!typescriptEntry(files)) return 'Include exactly one .ts source file.';
    return '';
  }
  if (isSourceOnlyLanguage(language)) return sourceProjectIssue(files, language);
  return entryOf(files) ? '' : 'Include an HTML page such as index.html.';
}
// A reply that changes nothing, or leaves out its selected project's entry files, counts as a formatting slip.
const slipped = (parsed, files, language) => (!parsed.files.length && !parsed.deletes.length) || !!projectIssue(files, language);
const SYMBOL = { new: '+', edit: '~', del: '−' };
const newId = () => globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

function BuildAnswer({ text }) {
  const full = String(text || '');
  const summary = full.replace(/```[\s\S]*?```/g, '').trim();
  return (
    <div className="build-answer">
      <div className="build-answer-summary"><Markdown text={summary || 'The project response is ready. Expand to inspect the complete AI output.'} /></div>
      <details className="build-answer-details">
        <summary>Full AI response</summary>
        <div className="build-answer-full"><Markdown text={full} /></div>
      </details>
    </div>
  );
}

export default function Builder({ seed }) {
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState('auto');
  const [languagePreference, setLanguagePreference] = useState('auto');
  const [preferenceReady, setPreferenceReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [compileState, setCompileState] = useState(null);
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
  const [lastBuildImages, setLastBuildImages] = useState([]);
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
  const projectConversation = useRef('');
  const latestBuild = useRef('');
  const seeded = useRef(false);
  const skip = useRef(false);
  const okRef = useRef(false);
  const toolsRef = useRef([]);
  const noteT = useRef(null);
  const timers = useRef([]);
  const histFollow = useFollow(history);
  useEffect(() => {
    let saved = 'auto';
    try { saved = normalizeLanguagePreference(window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY)); } catch {}
    setLanguagePreference(saved);
    setLanguage(saved);
    setPreferenceReady(true);
  }, []);
  useEffect(() => {
    if (!preferenceReady) return;
    try { window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, languagePreference); } catch {}
  }, [languagePreference, preferenceReady]);
  useEffect(() => {
    if (pane !== 'prompt') return;
    const frame = requestAnimationFrame(() => histFollow.down(false));
    return () => cancelAnimationFrame(frame);
  }, [pane, histFollow.down]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const hasFiles = Object.keys(files).length > 0;
  const sourceOnly = isSourceOnlyLanguage(language);
  const currentEntry = entryFor(files, language);
  const tsFiles = useMemo(() => typescriptFiles(files), [files]);
  const tsxFiles = useMemo(() => Object.keys(files).filter((path) => /\.tsx$/i.test(path)), [files]);
  const tsEntry = useMemo(() => typescriptEntry(files), [files]);
  const tsProject = language === 'typescript';

  useEffect(() => {
    if (language !== 'typescript') { setCompileState(null); return; }
    if (tsxFiles.length) {
      setCompileState({ files, status: 'error', error: 'TSX/JSX is not supported in this first TypeScript preview. Use one plain .ts browser script.' });
      return;
    }
    if (!tsFiles.length) {
      setCompileState(language === 'typescript' && hasFiles
        ? { files, status: 'error', error: 'This TypeScript project needs a .ts source file. Add script.ts or start a new TypeScript project.' }
        : null);
      return;
    }
    if (!tsEntry) {
      setCompileState({ files, status: 'error', error: 'This first TypeScript preview supports one source file. Keep the browser logic in script.ts.' });
      return;
    }
    let active = true;
    const snapshot = files;
    setCompileState({ files: snapshot, status: 'loading' });
    compileTypeScript(snapshot[tsEntry], tsEntry)
      .then(({ code }) => { if (active) setCompileState({ files: snapshot, status: 'done', code }); })
      .catch((error) => { if (active) setCompileState({ files: snapshot, status: 'error', error: String(error?.message || 'TypeScript compilation failed.').slice(0, 3000) }); });
    return () => { active = false; };
  }, [files, language, hasFiles, tsEntry, tsFiles, tsxFiles]);

  const tsCompiling = language === 'typescript' && hasFiles && (compileState?.files !== files || compileState.status === 'loading');
  const tsCompileError = language === 'typescript' && compileState?.files === files && compileState.status === 'error' ? compileState.error : '';
  const html = useMemo(() => {
    if (sourceOnly) return '';
    if (!tsProject) return bundle(files);
    if (compileState?.files !== files || compileState.status !== 'done') return '';
    const previewFiles = { ...files, 'script.js': compileState.code };
    const page = entryOf(previewFiles);
    if (page) {
      previewFiles[page] = previewFiles[page].replace(/(<script\b[^>]*\bsrc\s*=\s*["'])(?:\.\/)?(?:[^"']*\/)?[^/"']+\.ts(["'][^>]*>\s*<\/script>)/gi, '$1script.js$2');
    }
    return bundle(previewFiles);
  }, [files, tsProject, sourceOnly, compileState]); // only Web/TypeScript browser projects reach the existing sandboxed preview
  const liveMap = useMemo(() => {
    if (!busy) return null;
    const o = {};
    parseFiles(live).files.forEach((f) => { o[f.path] = { content: f.content, done: f.done }; });
    return o;
  }, [busy, live]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(noteT.current); }, []);
  useEffect(() => { const t = wbox.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [prompt]);
  useEffect(() => { if (seed && preferenceReady && !seeded.current) { seeded.current = true; build(seed, true); } }, [seed, preferenceReady]);
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
  const saveBuildFeedback = (id, value, feedback) => setHistory((current) => current.map((entry) => entry.id === id ? { ...entry, fb: value, feedback } : entry));
  const changeLanguagePreference = (value) => {
    const next = normalizeLanguagePreference(value);
    setLanguagePreference(next);
    if (!busy && !hasFiles && history.length === 0) setLanguage(next);
  };

  async function build(override, instant, options = {}) {
    const text = (override ?? prompt).trim();
    const replaying = !!options.regeneration;
    const imgs = Array.isArray(options.images) ? [...options.images] : [...a.images];
    if (!text && !imgs.length) return;
    if (!preferenceReady) return;
    if (busy) { setQueued(text || 'Build from the image'); setPrompt(''); return; } // the bar stays usable: this runs when the current build ends
    const first = history.length === 0 && !hasFiles;
    const requestedLanguage = language;
    let projectLanguage = requestedLanguage === 'auto' ? '' : requestedLanguage;
    const makeLog = (mode = '') => {
      const tag = requestedLanguage === 'auto' ? `[auto${mode ? `:${mode}` : ''}] ` : requestedLanguage !== 'web' ? `[${requestedLanguage}] ` : '';
      return tag + (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    };
    let logged = makeLog();
    const runKey = newId();
    let notificationFinished = false;
    const finishNotification = (state) => {
      if (notificationFinished) return;
      notificationFinished = true;
      reportTaskNotification(runKey, 'build', state);
    };
    const conversationId = projectConversation.current || (projectConversation.current = newId());
    latestBuild.current = runKey;
    skip.current = false; okRef.current = false;
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length, status: 'building', clientId: runKey }]);
    if (!replaying) { setPrompt(''); a.clear(); } setErr(''); setLive(''); setMarks({}); toolsRef.current = []; setTools([]); setBusy(true); setView(isSourceOnlyLanguage(projectLanguage) ? 'code' : 'preview'); setPane('preview');
    if (first) {
      // Welcome screen fades out, then the build workspace fades in.
      if (instant) { setEntering(true); later(() => setEntering(false), 800); }
      else { setLeaving(true); later(() => { setLeaving(false); setEntering(true); later(() => setEntering(false), 800); }, 380); }
    }
    reportTaskNotification(runKey, 'build', 'started');
    ctl.current = new AbortController();
    const baseSystem = requestedLanguage === 'auto' ? autoProjectPrompt() : projectLanguage === 'typescript' ? TYPESCRIPT_SYSTEM : isSourceOnlyLanguage(projectLanguage) ? sourceProjectPrompt(projectLanguage) : SYSTEM;
    const system = baseSystem + (hasFiles ? `\n\nCurrent files:\n${filesForPrompt(files, selected)}` : '');
    const user = [{ role: 'user', content: withImages(text, imgs, 'Build this.') }];
    const meta = {};
    const mark = (status, changed) => { const used = toolsRef.current; setHistory((h) => h.map((x, i) => (i === h.length - 1 ? { ...x, status, tools: used, ...(changed ? { changed } : {}) } : x))); };
    const showLive = (value) => setLive(stripProjectModeMarker(value));
    try {
      let reply = await streamChat({ messages: user, system, mode: 'build' }, showLive, ctl.current.signal, meta, onTool);
      let parsed = parseFiles(reply);
      let merged = mergeFiles(files, parsed);
      let tid = meta.tid;
      if (requestedLanguage === 'auto') projectLanguage = resolveProjectMode(reply, merged.files);
      logged = makeLog(projectLanguage);
      if (!projectLanguage || slipped(parsed, merged.files, projectLanguage)) {
        // Formatting slip: count it against that model, then retry once on the next one.
        track({ mode: 'build', prompt: logged, reply: '[FORMAT] no usable files', model: 'auto', tid: meta.tid, error: true, conversationId });
        const meta2 = {};
        const reminder = requestedLanguage === 'auto'
          ? autoProjectRetry(projectLanguage)
          : projectLanguage === 'typescript'
          ? '\n\nIMPORTANT: reply with one short sentence and complete file blocks. Include index.html and exactly one TypeScript source block named script.ts (```ts file=script.ts). Keep all browser logic in script.ts, use no imports, and have index.html reference script.js.'
          : isSourceOnlyLanguage(projectLanguage)
            ? sourceProjectRetry(projectLanguage)
            : '\n\nIMPORTANT: reply with one short sentence, then every file in its own fenced code block with the path on the opening line (for example ```html file=index.html). The project must include index.html.';
        reply = await streamChat({ messages: user, system: system + reminder, mode: 'build', retry: true }, showLive, ctl.current.signal, meta2, onTool);
        parsed = parseFiles(reply);
        merged = mergeFiles(files, parsed);
        tid = meta2.tid;
        if (requestedLanguage === 'auto') projectLanguage = resolveProjectMode(reply, merged.files) || projectLanguage;
        logged = makeLog(projectLanguage);
      }
      if (!projectLanguage || slipped(parsed, merged.files, projectLanguage)) {
        const issue = projectLanguage ? projectIssue(merged.files, projectLanguage) : '';
        throw new Error(!projectLanguage
          ? 'SYNTHCODE could not identify a supported project mode. Name a language in your request or choose one in Settings, then try again.'
          : projectLanguage === 'typescript'
            ? `SYNTHCODE could not produce a complete TypeScript project: ${issue || 'no usable project files'}. Please try again.`
            : isSourceOnlyLanguage(projectLanguage)
              ? `SYNTHCODE could not produce a complete ${languageLabel(projectLanguage)} source project: ${issue || 'no usable project files'}. Please try again.`
              : 'SYNTHCODE could not produce a page this time. Please try again.');
      }
      setLanguage(projectLanguage);
      setView(isSourceOnlyLanguage(projectLanguage) ? 'code' : 'preview');
      setFiles(merged.files);
      setMarks(Object.fromEntries(merged.changed.filter((c) => c.kind !== 'del').map((c) => [c.path, c.kind])));
      setSelected((s) => (s && s in merged.files ? s : entryFor(merged.files, projectLanguage)));
      mark('done', merged.changed); okRef.current = true;
      finishNotification('completed');
      setJustDone(true); later(() => setJustDone(false), 900);
      setBusy(false); // finished: stop the working animations right away, before the logging call returns
      const id = await track({ mode: 'build', prompt: logged, reply: `[files ${parsed.files.map((f) => f.path).join(', ')}] ` + (parsed.files[0]?.content || '').slice(0, 250), model: 'auto', tid, conversationId, ...(options.regeneratedFrom ? { regeneratedFrom: options.regeneratedFrom } : {}) });
      setHistory((current) => current.map((entry) => entry.clientId === runKey ? { ...entry, reply: stripProjectModeMarker(reply), id, fb: 0, feedback: null, ...(options.regeneratedFrom ? { regeneratedFrom: options.regeneratedFrom } : {}) } : entry));
      if (latestBuild.current === runKey) setLastBuildImages(imgs);
    } catch (e) {
      if (skip.current) { finishNotification('stopped'); setBusy(false); return; } // "New" was pressed while building
      setQueued('');
      const aborted = e.name === 'AbortError';
      finishNotification(aborted ? 'stopped' : 'failed');
      if (!aborted) { setErr(safeFrontendText(e.message.slice(0, 400))); setPane('prompt'); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: 'auto', error: true, conversationId }); }
      if (!hasFiles) { setHistory([]); setLive(''); setPrompt(text); setLanguage(languagePreference); setView(isSourceOnlyLanguage(languagePreference) ? 'code' : 'preview'); } // nothing built yet: back to the welcome screen
      else { mark(aborted ? 'stopped' : 'failed'); setLive(''); } // keep the last good project
    }
    setBusy(false);
  }

  const stop = () => { setQueued(''); ctl.current?.abort(); };

  function reset() {
    if (busy) { skip.current = true; ctl.current?.abort(); }
    setFiles({}); setDirs([]); setSelected(''); setMarks({}); toolsRef.current = []; setTools([]); setLive(''); setHistory([]); setErr(''); setLastBuildImages([]); projectConversation.current = ''; latestBuild.current = ''; setPane('prompt'); setPrompt(''); setQueued(''); setBusy(false); setFull(false); setView('preview'); setJustDone(false); setLanguage(languagePreference); setCompileState(null);
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
    const exportFiles = language === 'typescript' && compileState?.files === files && compileState.status === 'done'
      ? { ...files, 'script.js': compileState.code }
      : files;
    const names = Object.keys(exportFiles);
    return names.length > 1
      ? { blob: new Blob([makeZip(exportFiles)], { type: 'application/zip' }), name: 'synthcode-project.zip' }
      : { blob: new Blob([exportFiles[names[0]] || ''], { type: 'text/plain' }), name: names[0] || 'index.html' };
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
      else { await navigator.clipboard.writeText(files[selected] ?? files[currentEntry] ?? files[Object.keys(files).sort()[0]] ?? ''); flash('Copied the open file. File sharing is not supported here'); }
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
        <BuilderLanguageSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} preference={languagePreference} onChange={changeLanguagePreference} busy={busy} preferenceReady={preferenceReady} projectStarted={history.length > 0 || hasFiles} currentLanguage={language} />
        <div className="bw-scroll">
          <div className="bw-hero">
            <img className="bw-mark" src="/logo-mark.png" alt="" />
            <h2>Build or export with SYNTHCODE</h2>
            <p>Describe what you want and SYNTHCODE will choose a suitable project mode. Open Settings to set a preference; browser projects can be previewed and source projects exported.</p>
            <div className="bw-pills">
              {IDEAS.map((t, i) => <button key={t} className="bw-pill" style={{ '--i': i }} onClick={() => pick(t)}>{t}</button>)}
            </div>
          </div>
          <Workflow />
        </div>
        <div className="bw-dock">
          {err && <p className="err" role="alert">{err}</p>}
          <Thumbs a={a} />
          <NotificationSetupBanner category="build" />
          <div className="compose compose-stack">
            <textarea ref={wbox} value={prompt} rows={1} placeholder="Describe the app or page you want, or paste a screenshot" aria-label="Describe what to build"
              onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
            <div className="compose-toolbar builder-toolbar">
              <div className="toolbar-cluster">
                <AttachButton a={a} />
                <LanguageSettingsButton preference={languagePreference} onClick={() => setSettingsOpen(true)} open={settingsOpen} />
              </div>
              <span className="toolbar-spacer" />
              <VoiceInput onText={(t) => setPrompt((v) => v ? `${v} ${t}` : t)} />
              <button className="primary glow buildbtn" onClick={() => build()} disabled={!preferenceReady || (!prompt.trim() && !a.images.length)}>{sourceOnly ? 'Generate' : 'Build'} <Arrow /></button>
            </div>
          </div>
          <p className={'tools' + (sourceOnly ? ' source-only-tools' : '')}><span>{sourceOnly ? SOURCE_ONLY_NOTICE : 'Enter to build, Shift+Enter for a new line. You can also paste or drop an image.'}</span></p>
        </div>
      </section>
    );
  }

  return (
    <section className={'build' + (entering ? ' enter' : '')} data-pane={pane} {...a.dropProps}>
      <BuilderLanguageSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} preference={languagePreference} onChange={changeLanguagePreference} busy={busy} preferenceReady={preferenceReady} projectStarted={history.length > 0 || hasFiles} currentLanguage={language} />
      <div className="seg" role="group" aria-label="Workspace pane selection">
        <button type="button" aria-pressed={pane === 'prompt'} className={pane === 'prompt' ? 'on' : ''} onClick={() => setPane('prompt')}>Describe</button>
        <button type="button" aria-pressed={pane === 'preview'} className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>Preview</button>
      </div>

      <aside className="panel">
        <div className="phead">
          <div className="phead-title"><small>Project · {languageLabel(language)}</small><b title={history[0]?.text}>{history[0]?.text || 'Untitled'}</b></div>
          <div className="phead-tools">
            <span className={'status' + (busy ? ' busy' : hasFiles ? ' done' : '')}><i />{busy ? 'Building…' : hasFiles ? 'Ready' : 'Idle'}</span>
            <LanguageSettingsButton preference={languagePreference} onClick={() => setSettingsOpen(true)} open={settingsOpen} iconOnly />
          </div>
        </div>
        <div className="histwrap">
          <div className="hist" ref={histFollow.ref} onScroll={histFollow.onScroll}>
            {history.length > 1 && (
              <details className="earlier">
                <summary>Earlier requests ({history.length - 1})</summary>
                {history.slice(0, -1).map((h, i) => (
                  <div key={h.clientId || i} className="earlier-response">
                    <button className="eprev" onClick={() => pick(h.text)} title="Use this request as a starting point"><i className={'sdot ' + h.status} />{h.text}</button>
                    {h.reply && <><BuildAnswer text={h.reply} /><SourcesDisclosure sources={sourcesFromTools(h.tools)} /><ResponseToolbar key={h.id || h.clientId || i} id={h.id} response={h.reply} messageKey={h.clientId || h.id || i} initialRating={h.fb || 0} initialFeedback={h.feedback} disabled={busy} showRegenerate={false} onFeedbackSaved={saveBuildFeedback} /></>}
                  </div>
                ))}
              </details>
            )}
            {last && (
              <div className="lastreq">
                <small>Last request</small>
                <p>{last.text}{last.n > 0 && ` (+${last.n} image${last.n > 1 ? 's' : ''})`}</p>
                <ToolRuns tools={last.status === 'building' ? tools : last.tools} compact />
                <SourcesDisclosure sources={sourcesFromTools(last.status === 'building' ? tools : last.tools)} />
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
                {last.status === 'done' && last.reply && <BuildAnswer text={last.reply} />}
                {last.status === 'done' && last.reply && <ResponseToolbar
                  key={last.id || last.clientId}
                  id={last.id}
                  response={last.reply}
                  messageKey={last.clientId || last.id}
                  initialRating={last.fb || 0}
                  initialFeedback={last.feedback}
                  onRegenerate={() => build(last.text, false, { regeneration: true, regeneratedFrom: last.id || '', images: lastBuildImages })}
                  regenerateDescription="Rebuild from this request using the current project files and original screenshot"
                  disabled={busy}
                  regeneratedFrom={last.regeneratedFrom}
                  onFeedbackSaved={saveBuildFeedback}
                />}
              </div>
            )}
          </div>
          {histFollow.away && <button className={'godown' + (busy ? ' live' : '')} onClick={() => histFollow.down()} aria-label="Scroll to latest"><ArrowDown width="18" height="18" /></button>}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        {queued && <div className="queued"><span>Queued next: {queued}</span><button className="linkbtn" onClick={() => setQueued('')}>Cancel</button></div>}
        {hasFiles && <div className="editchips">{EDITS.map((t) => <button key={t} className="chip" onClick={() => pick(t)}>{t}</button>)}</div>}
        <Thumbs a={a} />
        <NotificationSetupBanner category="build" />
        <div className="compose col compose-stack">
          <div className="pbar-head"><i />prompt<span className="grow" /><span>{busy ? 'new requests are queued' : languageStatus(language)}</span></div>
          <textarea ref={wbox} value={prompt} rows={3} aria-label="Describe what to build or change"
            placeholder={busy ? 'Type your next request. It runs when this build finishes.' : hasFiles ? 'Ask for a change' : 'Describe what to build'}
            onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
          <div className="compose-toolbar builder-toolbar">
            <div className="toolbar-cluster">
              <AttachButton a={a} />
              <button type="button" className="toolbar-chip" onClick={reset} title="Start a new project"><Plus width="16" height="16" /><span className="toolbar-label">New</span></button>
            </div>
            <span className="toolbar-spacer" />
            <VoiceInput onText={(t) => setPrompt((v) => v ? `${v} ${t}` : t)} disabled={busy} />
            {busy && <button type="button" className="iconbtn sm stopbtn compose-stop" onClick={stop} aria-label="Stop build" title="Stop build"><Stop width="16" height="16" /></button>}
            <button type="button" className="primary glow buildbtn" onClick={() => build()} disabled={!preferenceReady || (!prompt.trim() && !a.images.length)}>{busy ? 'Queue' : sourceOnly ? 'Generate' : 'Build'} <Arrow width="16" height="16" /></button>
          </div>
        </div>
      </aside>

      <div className="stage panel">
        <div className="stagebar">
          <div className="tabs" role="group" aria-label="Project view">
            <button type="button" aria-pressed={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}><Globe width="16" height="16" />Preview</button>
            <button type="button" aria-pressed={view === 'code'} className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}><Build width="16" height="16" />Code</button>
            {busy && <span className="busytag"><i />{using ? 'using ' + using.label : <WordCycle />}…</span>}
          </div>
          <div className="actions" role="toolbar" aria-label="Page actions">
            <div className="builder-stage-settings"><LanguageSettingsButton preference={languagePreference} onClick={() => setSettingsOpen(true)} open={settingsOpen} iconOnly /></div>
            {!sourceOnly && <div className="devs">
              {[['desktop', Monitor], ['tablet', Tablet], ['phone', Phone]].map(([k, Ic]) => (
                <button key={k} className={'iconbtn sm' + (dev === k ? ' on' : '')} onClick={() => setDev(k)} aria-label={k + ' width'} title={k}><Ic /></button>
              ))}
            </div>}
            {!sourceOnly && <span className="sep" />}
            {!sourceOnly && <button className="iconbtn sm act-opt" disabled={!html} onClick={() => setFrame((n) => n + 1)} aria-label="Refresh preview" title="Refresh preview"><Refresh /></button>}
            {!sourceOnly && <button className="iconbtn sm" disabled={!html} onClick={() => setFull(true)} aria-label="Open full screen" title="Open full screen"><Open /></button>}
            <button className="iconbtn sm act-opt" disabled={!hasFiles} onClick={() => copyText(files[selected] ?? files[currentEntry] ?? files[Object.keys(files).sort()[0]] ?? '')} aria-label="Copy open file" title="Copy open file"><Copy /></button>
            <button className="iconbtn sm" disabled={!hasFiles || busy || tsCompiling} onClick={download} aria-label="Download project" title={sourceOnly ? 'Download source project' : 'Download project'}><Download /></button>
            <button className="iconbtn sm" disabled={!hasFiles || busy || tsCompiling} onClick={send} aria-label="Share project" title="Share project"><Send /></button>
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
            : sourceOnly
              ? <div className="source-only-preview" role="status">
                  <span className="source-only-eyebrow">SOURCE EXPORT ONLY</span>
                  <h3>{busy ? `Generating ${languageLabel(language)} files…` : `${languageLabel(language)} project files`}</h3>
                  <p>{busy ? 'SYNTHCODE is generating text files; it is not compiling or running this project.' : SOURCE_ONLY_NOTICE}</p>
                  <div className="source-only-actions">
                    <button type="button" className="primary" onClick={() => setView('code')} disabled={!hasFiles}>Open source files</button>
                    <button type="button" onClick={download} disabled={!hasFiles || busy}>Download project ZIP</button>
                  </div>
                </div>
              : busy
              ? <AssemblingPreview lines={live ? live.split('\n').length : 0} width={WIDTH[dev]} />
              : tsCompiling
                ? <div className="ts-compile-status" role="status">Preparing the TypeScript preview…</div>
                : tsCompileError
                  ? <div className="ts-compile-error" role="alert"><b>TypeScript preview could not compile.</b>{'\n'}{tsCompileError}</div>
                  : <p className="empty">Your app appears here.</p>}
        </div>
        <div className="pane" hidden={view !== 'code'}>
          {sourceOnly && <div className="source-export-note" role="note"><b>{languageLabel(language)} source export only</b><span>Not compiled, tested, run, or deployed here.</span></div>}
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
