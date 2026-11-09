'use client';
import { useCallback, useEffect, useState } from 'react';
import { modelLabel, providerLabel, safeFrontendText, serviceNodeLabel } from '../lib/brand-view.js';
import { DEFAULT_NOTIFICATION_SOUND_DEFAULTS, NOTIFICATION_SOUND_OPTIONS, normalizeNotificationSoundDefaults, playNotificationSound } from '../lib/notifications';

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const pc = (v) => (v == null ? '—' : v + '%');
const TSTATE = { healthy: ['ok', 'Healthy'], degraded: ['warn', 'Degraded'], down: ['bad', 'Down'], disabled: ['neutral', 'Off'], unknown: ['neutral', 'Not used yet'] };
const FEEDBACK_LABEL = { inaccurate: 'Inaccurate information', 'poor-explanation': 'Poor explanation', irrelevant: 'Irrelevant response', incomplete: 'Incomplete answer', other: 'Other' };
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

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

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/data', { cache: 'no-store' });
    if (r.status === 401) { setAuth(false); return; }
    setAuth(true); setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);
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
      setMsg(j.error ? `Learning needs attention: ${safeFrontendText(j.error).slice(0, 240)}` : `Analysed ${j.analyzed} interactions. ${j.added} new lessons, ${j.pulled} pulled from other agents.${model}${recovered}`);
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

  return (
    <div className="adm">
      <header className="admbar">
        <h1>SYNTH Learning Studio</h1>
        <button className="primary" disabled={busy} onClick={learn}>{busy ? 'Learning…' : 'Run learning now'}</button>
      </header>
      <div className="health">
        {[['Storage', d.health.storage, 'OK'], ['Cron authorization', d.health.cron, 'Configured']].map(([n, ok, ready]) => <span key={n} className={'pill ' + (ok ? 'ok' : 'bad')}>{n}: {ok ? ready : 'Missing'}</span>)}
        <span className={'pill ' + d.providers.openrouter.tone}>{providerLabel('openrouter')}: {d.providers.openrouter.label}</span>
        <span className={'pill ' + d.providers.spark.tone}>{providerLabel('spark')}: {d.providers.spark.label}</span>
        <span className={'pill ' + d.providers.cloudflare.tone}>{providerLabel('cloudflare')}: {d.providers.cloudflare.label}</span>
      </div>
      {!d.health.storage && <p className="err">Persistent storage is not connected, so activity and lessons may reset. Configure workspace storage, then redeploy.</p>}
      {d.providers.active.length === 0 && <p className="err">No SYNTH service is ready right now. Review the workspace service settings and try again.</p>}
      {msg && <p className="note">{msg}</p>}
      {d.lastResult?.error && !msg && <p className="err" role="status">Latest learning run needs attention: {safeFrontendText(d.lastResult.error)}</p>}

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

      <section>
        <h2>Where it needs work</h2>
        {!d.focus?.areas?.length ? <p className="empty">No focus areas yet. They appear after the learning run has enough activity (at least 3 interactions).</p> :
          d.focus.areas.sort((a, b) => b.severity - a.severity).map((a, i) => (
            <div key={i} className={'focus s' + a.severity}><b>{a.topic}</b><span>{a.why}</span><em>{['', 'Minor', 'Moderate', 'Urgent'][a.severity] || ''}</em></div>
          ))}
      </section>

      <section>
        <h2>Lessons</h2>
        <div className="tabs">
          {['pending', 'approved', 'rejected'].map((f) => <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>{f} ({counts(f)})</button>)}
        </div>
        {list.length === 0 && <p className="empty">Nothing here.</p>}
        {list.map((l) => (
          <div key={l.id} className="lesson">
            <div><b>{safeFrontendText(l.topic)}</b> <span className="muted">from {safeFrontendText(l.source)}{l.by ? ' (' + modelLabel(l.by) + ')' : ''}, {ago(l.ts)}</span><p>{safeFrontendText(l.text)}</p></div>
            <div className="row">
              {l.status !== 'approved' && <button className="primary" onClick={() => act('approve', l.id)}>Approve</button>}
              {l.status !== 'rejected' && <button onClick={() => act('reject', l.id)}>Reject</button>}
              <button onClick={() => act('delete', l.id)}>Delete</button>
            </div>
          </div>
        ))}
        <form className="addl" onSubmit={add}>
          <input placeholder="Topic" value={nt.topic} onChange={(e) => setNt({ ...nt, topic: e.target.value })} />
          <input placeholder="Teach it something: a guideline in one sentence" value={nt.text} onChange={(e) => setNt({ ...nt, text: e.target.value })} />
          <button disabled={nt.text.trim().length < 10}>Add lesson</button>
        </form>
      </section>

      <section>
        <h2>Service health</h2>
        <p className="muted">Order: {d.providers.order.map(providerLabel).join(' → ')}. In use now: {d.providers.active.length ? d.providers.active.map(providerLabel).join(' → ') : 'none'}. Unavailable services are skipped; failures move to the next configured option.</p>
        {d.providers.notes.map((n, i) => <p key={i} className="note">{safeFrontendText(n)}</p>)}
        <div className="scroll"><table>
          <thead><tr><th>SYNTH service</th><th>State</th><th>Served (recent)</th><th>Failed attempts</th><th>Last success</th></tr></thead>
          <tbody>{[[providerLabel('openrouter'), d.providers.openrouter], [providerLabel('spark'), d.providers.spark], [providerLabel('cloudflare'), d.providers.cloudflare]].map(([n, p]) => (
            <tr key={n}><td>{n}</td><td><span className={'pill ' + p.tone}>{p.label}</span></td><td>{p.served}</td><td>{p.failed}</td><td>{p.lastOk ? ago(p.lastOk) : '—'}</td></tr>
          ))}</tbody>
        </table></div>
      </section>

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

      <section>
        <h2>SYNTH Routing Diagnostics</h2>
        <p className="muted">Routing: {d.providers.active.length ? d.providers.active.map(providerLabel).join(' → ') : 'no service ready'}. Every request is logged for reliability insights.</p>
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

      <section>
        <h2>SYNTHCORE Training Progress</h2>
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

        <h3>Task coverage</h3>
        {d.core.tasks.map((t) => (
          <div key={t.key} className="cover">
            <span>{t.label} <small className="muted">({t.lane})</small></span>
            <div className="bar"><i style={{ width: t.pct + '%' }} /></div>
            <b>{t.n}</b>
          </div>
        ))}

        <h3>SYNTH engine contribution</h3>
        {d.core.models.length === 0 ? <p className="empty">No training data yet. It builds up with every request.</p> : (
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
      </section>

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
    </div>
  );
}
