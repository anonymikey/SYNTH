'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { modelLabel, providerLabel, safeFrontendText, serviceNodeLabel } from '../lib/brand-view.js';
import { DEFAULT_NOTIFICATION_SOUND_DEFAULTS, NOTIFICATION_SOUND_OPTIONS, normalizeNotificationSoundDefaults, playNotificationSound } from '../lib/notifications';

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const pc = (v) => (v == null ? '—' : v + '%');
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const TSTATE = { healthy: ['ok', 'Healthy'], degraded: ['warn', 'Degraded'], down: ['bad', 'Down'], disabled: ['neutral', 'Off'], unknown: ['neutral', 'Not used yet'] };
const FEEDBACK_LABEL = { inaccurate: 'Inaccurate information', 'poor-explanation': 'Poor explanation', irrelevant: 'Irrelevant response', incomplete: 'Incomplete answer', other: 'Other' };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const PROVIDER_REFRESH_MS = 15_000;
const clock = (t) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
const STUDIO_SECTIONS = [
  ['training', 'Training progress', 'Evidence coverage and engine contribution'],
  ['providers', 'Provider health', 'Live status and recent provider outcomes'],
  ['sounds', 'Workspace sounds', 'Default completion tones'],
  ['review', 'Learning review', 'Focus areas and lesson approvals'],
  ['tools', 'Agent tools', 'Availability, limits and recent calls'],
  ['routing', 'Routing diagnostics', 'Real request outcomes and fallbacks'],
  ['activity', 'Recent activity', 'Logged interactions and feedback'],
];

function StudioSection({ id, title, description, active, onSelect, children }) {
  const contentId = `studio-content-${id}`;
  return (
    <section className={'studio-section' + (active ? ' is-open' : '')} id={`studio-${id}`}>
      <h2>
        <button type="button" className="studio-section-toggle" aria-expanded={active} aria-controls={contentId} onClick={onSelect}>
          <span><b>{title}</b><small>{description}</small></span>
          <span className="studio-section-state" aria-hidden="true">{active ? '−' : '+'}</span>
        </button>
      </h2>
      <div id={contentId} className="studio-section-content" hidden={!active}>{children}</div>
    </section>
  );
}

function TrainingProgress({ d, busy, onRun, message }) {
  return (
    <section>
      <h2>SYNTHCORE Training Progress</h2>
      <div className="studio-training-actions">
        <div><b>Run a learning analysis</b><span>Uses recent interaction evidence and configured analysis providers; provider account limits may apply.</span></div>
        <button className="primary" type="button" onClick={onRun} disabled={busy}>{busy ? 'Learning…' : 'Run learning now'}</button>
      </div>
      {(busy || message || d.lastResult?.error || d.lastResult?.message) && <p className={'studio-training-status ' + (message && /failed|error/i.test(message) || d.lastResult?.error ? 'err' : 'note')} role="status" aria-live="polite">{busy ? 'Collecting recent activity and running the configured learning analysis…' : message || (d.lastResult?.error ? `Latest learning run needs attention: ${safeFrontendText(d.lastResult.error)}` : safeFrontendText(d.lastResult.message))}</p>}
      <div className="core">
        <div className="corepct"><b>{d.core.readiness.pct}%</b><span>{d.core.readiness.label}</span></div>
        <div className="coreparts">
          {d.core.readiness.parts.map((p) => (
            <div key={p.name}>
              <div className="row"><span>{p.name} <small className="muted">({p.weight}% of score)</small></span><span className="grow" /><b>{p.pct}%</b></div>
              <div className="bar"><i style={{ width: p.pct + '%' }} /></div>
              <small className="muted">{p.detail}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="muted">SYNTHCORE currently collects real-use evidence and approved prompt lessons; upstream model weights are not retrained. This readiness score measures evidence coverage only: it does not create or activate a first-party SYNTHCORE inference model, and it does not change service routing. Using a trained SYNTH model first later requires a model endpoint plus a separate inference integration.</p>
      <details className="studio-detail">
        <summary>Task coverage <span>{plural(d.core.tasks.length, 'area')}</span></summary>
        <div className="studio-detail-body">{d.core.tasks.map((t) => (
          <div key={t.key} className="cover">
            <span>{t.label} <small className="muted">({t.lane})</small></span>
            <div className="bar"><i style={{ width: t.pct + '%' }} /></div>
            <b>{t.n}</b>
          </div>
        ))}</div>
      </details>
      <details className="studio-detail">
        <summary>SYNTH engine contribution <span>{plural(d.core.models.length, 'engine')}</span></summary>
        {d.core.models.length === 0 ? <p className="empty studio-detail-body">No training data yet. It builds up with every request.</p> : (
        <div className="scroll"><table>
          <thead><tr><th>Engine alias</th><th>Training share</th><th>Served</th><th>Success</th><th>Helpful</th><th>Avg latency</th><th>Lessons</th><th>What it can do</th></tr></thead>
          <tbody>{d.core.models.map((m) => (
            <tr key={m.id}>
              <td>{modelLabel(m.id)}</td>
              <td><b>{m.share}%</b><div className="bar sm"><i style={{ width: Math.min(100, m.share) + '%' }} /></div></td>
              <td>{m.served}</td>
              <td>{pc(m.success)}</td>
              <td>{m.ratings ? pc(m.helpful) + ' (' + m.ratings + ')' : '—'}</td>
              <td>{m.avgMs != null ? m.avgMs + ' ms' : '—'}</td>
              <td>{m.lessons}</td>
              <td>{m.abilities.length ? m.abilities.map((a) => <span key={a.task} className={'pill ' + (a.strong ? 'ok' : 'warn')} title={a.n + ' tasks, ' + a.pct + '% success'}>{a.label}{a.strong ? ' ★' : ''}</span>) : <span className="muted">Not enough data yet</span>}</td>
            </tr>
          ))}</tbody>
        </table></div>
        )}
      </details>
    </section>
  );
}

export default function Admin() {
  const [d, setD] = useState(null);
  const [auth, setAuth] = useState(true);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(false);
  const [tbusy, setTbusy] = useState('');
  const [nt, setNt] = useState({ topic: '', text: '' });
  const [soundDraft, setSoundDraft] = useState({ ...DEFAULT_NOTIFICATION_SOUND_DEFAULTS });
  const [soundBusy, setSoundBusy] = useState(false);
  const [soundStatus, setSoundStatus] = useState('');
  const [liveProviders, setLiveProviders] = useState(null);
  const [providerUpdatedAt, setProviderUpdatedAt] = useState(0);
  const [providerRefreshing, setProviderRefreshing] = useState(false);
  const [providerRefreshError, setProviderRefreshError] = useState('');
  const providerRequest = useRef(false);
  const [activeSection, setActiveSection] = useState('training');

  function selectSection(id) {
    setActiveSection(id);
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.requestAnimationFrame(() => document.getElementById(`studio-${id}`)?.scrollIntoView({ behavior, block: 'start' }));
  }

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/data', { cache: 'no-store' });
    if (r.status === 401) { setAuth(false); return; }
    setAuth(true); setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
  const loadProviderHealth = useCallback(async (quiet = false) => {
    if (providerRequest.current) return;
    providerRequest.current = true;
    if (!quiet) setProviderRefreshing(true);
    try {
      const response = await fetch('/api/admin/providers', { cache: 'no-store' });
      if (response.status === 401) { setAuth(false); return; }
      if (!response.ok) throw new Error('Provider health is unavailable.');
      const snapshot = await response.json();
      if (!snapshot.providers || !Number.isFinite(Number(snapshot.refreshedAt))) throw new Error('Invalid health snapshot.');
      setLiveProviders(snapshot.providers);
      setProviderUpdatedAt(Number(snapshot.refreshedAt));
      setProviderRefreshError('');
    } catch {
      setProviderRefreshError('Refresh failed. Showing the latest available snapshot.');
    } finally {
      providerRequest.current = false;
      if (!quiet) setProviderRefreshing(false);
    }
  }, []);
  useEffect(() => {
    if (!d || !auth) return;
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') loadProviderHealth(true);
    };
    refreshIfVisible();
    const timer = window.setInterval(refreshIfVisible, PROVIDER_REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [d, auth, loadProviderHealth]);
  useEffect(() => {
    if (d?.notificationSounds) setSoundDraft(normalizeNotificationSoundDefaults(d.notificationSounds));
  }, [d?.notificationSounds]);

  async function login(e) {
    e.preventDefault();
    const r = await post('/api/admin/login', { password: pw });
    if (r.ok) { setMsg(''); load(); } else setMsg(safeFrontendText((await r.json()).error || 'Sign-in failed.'));
  }
  const act = async (action, id) => { await post('/api/admin/lesson', { action, id }); load(); };
  async function toolAct(body) {
    setTbusy(body.id || 'all');
    try { await post('/api/admin/tools', body); } catch {}
    setTbusy(''); load();
  }
  async function learn() {
    setBusy(true); setMsg('');
    try {
      const r = await post('/api/admin/learn');
      const j = await r.json();
      if (!r.ok) throw new Error(safeFrontendText(j.error || `Learning request failed (HTTP ${r.status}).`));
      const recovered = j.attempts?.length ? ` Checked ${j.attempts.length} alternate route(s).` : '';
      const model = j.model ? ` Engine used: ${modelLabel(j.model)}.` : '';
      setMsg(j.status === 'insufficient_data' ? safeFrontendText(j.message || 'More activity is needed before analysis can run.') : `Analysed ${j.analyzed} interactions. ${plural(j.added, 'new lesson')}, ${j.pulled} pulled from other agent${j.pulled === 1 ? '' : 's'}.${model}${recovered}${j.feedIssues?.length ? ` ${j.feedIssues.length} configured feed(s) need attention.` : ''}`);
    } catch (error) {
      setMsg(`Learning request failed: ${safeFrontendText(error.message || error).slice(0, 300)}`);
    } finally {
      setBusy(false);
      load();
    }
  }
  async function add(e) {
    e.preventDefault();
    await post('/api/admin/lesson', { action: 'add', ...nt }); setNt({ topic: '', text: '' }); setFilter('approved'); load();
  }
  async function saveSoundDefaults(category, sound) {
    const next = normalizeNotificationSoundDefaults({ ...soundDraft, [category]: sound });
    setSoundDraft(next); setSoundBusy(true); setSoundStatus('');
    try {
      const response = await post('/api/admin/notification-sounds', next);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not save workspace sounds.');
      const saved = normalizeNotificationSoundDefaults(result.sounds);
      setSoundDraft(saved);
      setD((current) => current ? { ...current, notificationSounds: saved } : current);
      setSoundStatus('Workspace sound defaults saved.');
    } catch {
      setSoundDraft(normalizeNotificationSoundDefaults(d?.notificationSounds));
      setSoundStatus('Could not save workspace sound defaults. Try again.');
    } finally { setSoundBusy(false); }
  }
  async function previewSound(category) {
    const played = await playNotificationSound(soundDraft[category]);
    setSoundStatus(played ? 'Previewing the selected sound.' : soundDraft[category] === 'silent' ? 'This workspace default is Silent.' : 'Sound preview is unavailable in this browser.');
  }

  if (!auth) return (
    <div className="adm"><form className="login" onSubmit={login}>
      <img src="/logo-mark.png" alt="" width="64" height="64" />
      <h1>SYNTH Learning Studio</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Studio passphrase" autoFocus />
      <button className="primary">Enter studio</button>
      {msg && <p className="err">{msg}</p>}
    </form></div>
  );
  if (!d) return <div className="adm"><p className="empty">Loading…</p></div>;

  const s = d.stats, rated = s.up + s.down;
  const tcalls = d.tools.rows.reduce((a, t) => a + t.calls, 0), tok = d.tools.rows.reduce((a, t) => a + t.ok, 0);
  const counts = (st) => d.lessons.filter((l) => l.status === st).length;
  const list = d.lessons.filter((l) => l.status === filter);
  const providers = liveProviders || d.providers;
  const providerRows = [
    ['openrouter', providerLabel('openrouter')],
    ['spark', providerLabel('spark')],
    ['cloudflare', providerLabel('cloudflare')],
    ['unorouter', providerLabel('unorouter')],
    ['apinex', providerLabel('apinex')],
  ];

  return (
    <div className="adm">
      <header className="admbar">
        <h1>SYNTH Learning Studio</h1>
      </header>
      <div className="health">
        {[['Storage', d.health.storage, 'OK'], ['Cron authorization', d.health.cron, 'Configured']].map(([n, ok, ready]) => <span key={n} className={'pill ' + (ok ? 'ok' : 'bad')}>{n}: {ok ? ready : 'Missing'}</span>)}
        <span className={'pill ' + providers.openrouter.tone}>{providerLabel('openrouter')}: {providers.openrouter.label}</span>
        <span className={'pill ' + providers.spark.tone}>{providerLabel('spark')}: {providers.spark.label}</span>
        <span className={'pill ' + providers.cloudflare.tone}>{providerLabel('cloudflare')}: {providers.cloudflare.label}</span>
        <span className={'pill ' + providers.unorouter.tone}>{providerLabel('unorouter')}: {providers.unorouter.label}</span>
        <span className={'pill ' + providers.apinex.tone}>{providerLabel('apinex')}: {providers.apinex.label}</span>
      </div>
      {!d.health.storage && <p className="err">Persistent storage is not connected, so activity and lessons may reset. Configure workspace storage, then redeploy.</p>}
      {providers.active.length === 0 && <p className="err">No SYNTH service is ready right now. Review the workspace service settings and try again.</p>}
      <nav className="studio-nav" aria-label="Learning Studio sections">
        {STUDIO_SECTIONS.map(([id, title]) => <button type="button" key={id} className={activeSection === id ? 'on' : ''} aria-pressed={activeSection === id} onClick={() => selectSection(id)}>{title}</button>)}
      </nav>

      <StudioSection id="training" title="SYNTHCORE Training Progress" description={`${d.core.readiness.pct}% evidence readiness · ${plural(d.core.tasks.length, 'task area')}`} active={activeSection === 'training'} onSelect={() => selectSection('training')}>
        <TrainingProgress d={d} busy={busy} onRun={learn} message={msg} />
      </StudioSection>

      <StudioSection id="providers" title="Real-time provider health" description="Live status, recent outcomes, and service diagnostics" active={activeSection === 'providers'} onSelect={() => selectSection('providers')}>
      <section className="admin-provider-health" aria-labelledby="admin-provider-health-title">
        <div className="admin-provider-health-head">
          <div>
            <h2 id="admin-provider-health-title">Real-time Providers Health</h2>
            <p>Live configuration and real task outcomes from the last 15 minutes. No test prompts are sent or provider quota consumed.</p>
          </div>
          <div className="admin-provider-health-actions">
            <span className="admin-provider-refresh-meta" role="status" aria-live="polite">
              {providerRefreshing ? 'Refreshing provider snapshot…' : (providerUpdatedAt ? `Updated ${clock(providerUpdatedAt)} · auto-refreshes every 15 sec` : 'Loading live health…')}
            </span>
            <button type="button" className="admin-provider-refresh" onClick={() => loadProviderHealth(false)} disabled={providerRefreshing}>
              {providerRefreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
        {providerRefreshError && <p className="admin-provider-refresh-error" role="status">{providerRefreshError}</p>}
        <div className="admin-provider-grid">
          {providerRows.map(([id, label]) => {
            const provider = providers[id];
            const live = provider.realtime || { state: 'unknown', label: 'Not used yet', tone: 'neutral' };
            return (
              <article key={id} className={'admin-provider-card is-' + live.state}>
                <div className="admin-provider-card-head">
                  <div><h3>{label}</h3><span className="admin-provider-route-label">{providers.active.includes(id) ? 'In provider order' : 'Not currently routed'}</span></div>
                  <span className={'pill ' + live.tone}>{live.label}</span>
                </div>
                <div className="admin-provider-counts">
                  <div><b>{provider.recentServed || 0}</b><span>served · 15m</span></div>
                  <div><b>{provider.recentFailed || 0}</b><span>failed · 15m</span></div>
                </div>
                <div className="admin-provider-last"><span>Last success</span><b>{provider.lastOk ? ago(provider.lastOk) : '—'}</b></div>
                {provider.lastError && <p className="admin-provider-issue"><span>Last issue{provider.lastFailAt ? ` · ${ago(provider.lastFailAt)}` : ''}</span>{safeFrontendText(provider.lastError)}</p>}
              </article>
            );
          })}
        </div>
        {providers.notes.map((n, i) => <p key={i} className="note">{safeFrontendText(n)}</p>)}
      </section>
      </StudioSection>

      <div className="stats">
        <div><b>{s.total}</b>interactions logged</div>
        <div><b>{s.last24h}</b>in the last 24 hours</div>
        <div><b>{rated ? Math.round((s.up / rated) * 100) + '%' : 'n/a'}</b>rated helpful ({rated} ratings)</div>
        <div><b>{counts('approved')}</b>active lessons</div>
        <div><b>{counts('pending')}</b>waiting for review</div>
        <div><b>{s.feedbackNotes || 0}</b>feedback notes attached to responses</div>
      </div>
      {Object.keys(d.feedback?.byCategory || {}).length > 0 && <p className="muted">Recent response feedback: {Object.entries(d.feedback.byCategory).map(([key, value]) => `${FEEDBACK_LABEL[key] || key} (${value})`).join(' · ')}.</p>}
      <p className="muted">SYNTH ASSISTANT {s.chat}, SYNTHCODE {s.build}. Lessons by source: {Object.entries(d.bySource).map(([k, v]) => `${safeFrontendText(k)} (${v})`).join(', ') || 'none yet'}. {d.lastResult ? `Last learning run ${ago(d.lastResult.ts)}${d.lastResult.model ? `; completed by ${modelLabel(d.lastResult.model)}` : ''}${d.lastResult.attempts?.length ? ` after ${d.lastResult.attempts.length} failed attempt(s)` : ''}.` : 'Learning has not run yet.'}</p>
      {d.lastResult?.attempts?.length > 0 && <p className="note" aria-live="polite">Learning attempts: {d.lastResult.attempts.map((a) => `${serviceNodeLabel(a.target)} (${a.status ? `HTTP ${a.status}` : 'unavailable'}: ${safeFrontendText(a.error)})`).join(' → ')}{d.lastResult.model ? ` → succeeded with ${modelLabel(d.lastResult.model)}.` : ''}</p>}

      <StudioSection id="sounds" title="Workspace notification sounds" description="Choose default Assistant and SYNTHCODE tones" active={activeSection === 'sounds'} onSelect={() => selectSection('sounds')}>
      <section className="admin-sound-settings">
        <div className="admin-sound-heading"><div><h2>Workspace notification sounds</h2><p>Set the default tones for users who choose “Use Learning Studio default” in Settings → Notification. Users can still choose their own sounds.</p></div></div>
        <div className="admin-sound-grid">
          {[['assistant', 'Assistant'], ['build', 'SYNTHCODE']].map(([category, label]) => (
            <div className="admin-sound-control" key={category}>
              <label htmlFor={`admin-sound-${category}`}>{label} default</label>
              <div className="admin-sound-select-row">
                <select id={`admin-sound-${category}`} value={soundDraft[category]} disabled={soundBusy} onChange={(event) => saveSoundDefaults(category, event.target.value)}>
                  {NOTIFICATION_SOUND_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
                <button type="button" disabled={soundBusy} onClick={() => previewSound(category)}>Preview</button>
              </div>
            </div>
          ))}
        </div>
        <p className="admin-sound-status" role="status" aria-live="polite">{soundStatus}</p>
      </section>
      </StudioSection>

      <StudioSection id="review" title="Learning review" description={`${plural(d.focus?.areas?.length || 0, 'focus area')} · ${plural(counts('pending'), 'lesson')} awaiting review`} active={activeSection === 'review'} onSelect={() => selectSection('review')}>
      <section>
        <details className="studio-detail">
          <summary>Where it needs work <span>{plural(d.focus?.areas?.length || 0, 'focus area')}</span></summary>
          {!d.focus?.areas?.length ? <p className="empty studio-detail-body">No focus areas yet. They appear after the learning run has enough activity (at least 3 interactions).</p> :
            <div className="studio-list-scroll" role="region" aria-label="Learning focus areas" tabIndex={0}>
              {[...d.focus.areas].sort((a, b) => b.severity - a.severity).map((a, i) => (
                <div key={i} className={'focus s' + a.severity}><b>{a.topic}</b><span>{a.why}</span><em>{['', 'Minor', 'Moderate', 'Urgent'][a.severity] || ''}</em></div>
              ))}
            </div>}
        </details>
      </section>

      <section>
        <h2>Lessons</h2>
        <div className="tabs">
          {['pending', 'approved', 'rejected'].map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f} ({counts(f)})</button>)}
        </div>
        {list.length === 0 && <p className="empty">Nothing here.</p>}
        {list.length > 0 && <div className="studio-list-scroll" role="region" aria-label={`${filter} learning lessons`} tabIndex={0}>{list.map((l) => (
          <div key={l.id} className="lesson">
            <div><b>{safeFrontendText(l.topic)}</b> <span className="muted">from {safeFrontendText(l.source)}{l.by ? ' (' + modelLabel(l.by) + ')' : ''}, {ago(l.ts)}</span><p>{safeFrontendText(l.text)}</p></div>
            <div className="row">
              {l.status !== 'approved' && <button className="primary" onClick={() => act('approve', l.id)}>Approve</button>}
              {l.status !== 'rejected' && <button onClick={() => act('reject', l.id)}>Reject</button>}
              <button onClick={() => act('delete', l.id)}>Delete</button>
            </div>
          </div>
        ))}</div>}
        <form className="addl" onSubmit={add}>
          <input placeholder="Topic" value={nt.topic} onChange={(e) => setNt({ ...nt, topic: e.target.value })} />
          <input placeholder="Teach it something: a guideline in one sentence" value={nt.text} onChange={(e) => setNt({ ...nt, text: e.target.value })} />
          <button disabled={nt.text.trim().length < 10}>Add lesson</button>
        </form>
      </section>
      </StudioSection>

      <StudioSection id="tools" title="Agent tools" description={`${d.tools.rows.length} tools · ${tcalls} calls`} active={activeSection === 'tools'} onSelect={() => selectSection('tools')}>
      <section>
        <h2>Agent tools</h2>
        <p className="muted">Built-in tools SYNTH ASSISTANT and SYNTHCODE can call while answering. Availability and limits can vary by tool. A tool that keeps failing turns red here, and you can switch any tool off without redeploying.</p>
        {!d.tools.enabled && <p className="note">Tools are switched off for this workspace.</p>}
        <div className="stats">
          <div><b>{d.tools.rows.filter((t) => t.enabled).length}/{d.tools.rows.length}</b>tools switched on</div>
          <div><b>{tcalls}</b>calls so far</div>
          <div><b>{tcalls ? Math.round((100 * tok) / tcalls) + '%' : 'n/a'}</b>succeeded</div>
          <div><b>{d.tools.rows.filter((t) => t.enabled && (t.state === 'down' || t.state === 'degraded')).length}</b>need attention</div>
        </div>
        <div className="row">
          <button disabled={!!tbusy} onClick={() => toolAct({ action: 'check' })}>{tbusy === 'all' ? 'Checking…' : 'Check all tools'}</button>
          <span className="muted">Runs one small sample call per tool. It is not counted as usage.</span>
        </div>
        <div className="scroll"><table>
          <thead><tr><th>Tool</th><th>Health</th><th>Calls</th><th>Success</th><th>Avg time</th><th>Last used</th><th>Last problem</th><th /></tr></thead>
          <tbody>{d.tools.rows.map((t) => {
            const [tone, label] = TSTATE[t.state] || TSTATE.unknown;
            return (
              <tr key={t.id}>
                <td><b>{safeFrontendText(t.label)}</b></td>
                <td><span className={'pill ' + tone}>{label}</span>{t.probe && <div className="muted">checked {ago(t.probe.ts)}{t.probe.ok ? ', ' + t.probe.ms + ' ms' : ', failed'}</div>}</td>
                <td>{t.calls}</td>
                <td>{t.calls ? Math.round((100 * t.ok) / t.calls) + '%' : '—'}</td>
                <td>{t.avgMs != null ? t.avgMs + ' ms' : '—'}</td>
                <td>{t.lastUsed ? ago(t.lastUsed) : '—'}</td>
                <td className="muted">{t.lastError ? safeFrontendText(t.lastError.error) : t.probe && !t.probe.ok ? safeFrontendText(t.probe.error) : ''}</td>
                <td className="tact">
                  <button className="sm" disabled={!!tbusy} onClick={() => toolAct({ action: 'toggle', id: t.id, enabled: !t.enabled })}>{t.enabled ? 'Turn off' : 'Turn on'}</button>
                  <button className="sm" disabled={!!tbusy} onClick={() => toolAct({ action: 'check', id: t.id })}>{tbusy === t.id ? '…' : 'Check'}</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table></div>
        <h3>Recent tool calls</h3>
        {d.tools.recent.length === 0 ? <p className="empty">No tool has been used yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>When</th><th>Tool</th><th>Used by</th><th>Input</th><th>Result</th><th>Time</th></tr></thead>
            <tbody>{d.tools.recent.map((x, i) => (
              <tr key={i}>
                <td>{ago(x.ts)}</td><td>{safeFrontendText(x.tool)}</td><td>{x.mode === 'build' ? 'SYNTHCODE' : x.mode === 'chat' ? 'ASSISTANT' : ''}</td><td className="muted">{safeFrontendText(x.input)}</td>
                <td><span className={'pill ' + (x.ok ? 'ok' : 'bad')}>{x.ok ? 'OK' : 'Failed'}</span>{!x.ok && <div className="muted">{safeFrontendText(x.error)}</div>}</td><td>{x.ms} ms</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      </StudioSection>

      <StudioSection id="routing" title="SYNTH Routing Diagnostics" description={`${d.spark.metrics.total} requests · ${d.spark.metrics.failed} failed completely`} active={activeSection === 'routing'} onSelect={() => selectSection('routing')}>
      <section>
        <h2>SYNTH Routing Diagnostics</h2>
        <p className="muted">Routing: {providers.active.length ? providers.active.map(providerLabel).join(' → ') : 'no service ready'}. Every request is logged for reliability insights.</p>
        <div className="stats">
          <div><b>{d.spark.metrics.total}</b>requests logged</div>
          <div><b>{d.spark.metrics.total ? Math.round((d.spark.metrics.success / d.spark.metrics.total) * 100) + '%' : 'n/a'}</b>clean success</div>
          <div><b>{d.spark.metrics.fallback}</b>served after failover</div>
          <div><b>{d.spark.metrics.failed}</b>failed completely</div>
          <div><b>{d.spark.metrics.avgMs ? d.spark.metrics.avgMs + ' ms' : 'n/a'}</b>avg time to first token</div>
        </div>
        {d.spark.entries.length === 0 ? <p className="empty">No requests recorded yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Time</th><th>Task</th><th>SYNTH engine</th><th>Failovers</th><th>Latency</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>{d.spark.entries.map((x, i) => (
              <tr key={x.tid || i}>
                <td>{ago(x.ts)}</td>
                <td>{x.mode === 'build' ? 'SYNTHCODE' : 'ASSISTANT'}: {x.task}{x.step ? ' · after tools' : ''}</td>
                <td>{serviceNodeLabel(x.node)}</td>
                <td>{x.failovers}</td>
                <td>{x.ms} ms</td>
                <td><span className={'pill ' + (x.status === 'Success' ? 'ok' : x.status === 'Fallback' ? 'warn' : 'bad')}>{x.status}</span></td>
                <td className="muted">{x.fails && x.fails[0] ? `${serviceNodeLabel(x.fails[0].target)}: ${safeFrontendText(x.fails[0].msg)}` : ''}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>
      </StudioSection>

      <StudioSection id="activity" title="Recent activity" description={`${d.recent.length} recent interactions`} active={activeSection === 'activity'} onSelect={() => selectSection('activity')}>
      <section>
        <h2>Recent activity</h2>
        <div className="scroll"><table>
          <thead><tr><th>When</th><th>Mode</th><th>Request</th><th>Response</th><th>Rating</th><th>Feedback details</th></tr></thead>
          <tbody>{d.recent.map((e) => (
            <tr key={e.id}>
              <td>{ago(e.ts)}</td><td>{e.mode}</td><td>{(e.prompt || '').slice(0, 90)}</td>
              <td>{e.regeneratedFrom ? <><span className="pill warn">Regenerated</span><small className="admin-subtext">From {e.regeneratedFrom}</small></> : 'Original'}</td>
              <td>{e.error ? 'Generation error' : e.fb === 1 ? 'Helpful' : e.fb === -1 ? 'Not helpful' : ''}</td>
              <td>{e.feedback?.category && <span className="pill warn">{FEEDBACK_LABEL[e.feedback.category] || e.feedback.category}</span>}{e.feedback?.comment && <p className="admin-feedback-note">{e.feedback.comment}</p>}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      </StudioSection>
    </div>
  );
}
