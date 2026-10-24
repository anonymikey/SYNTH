'use client';
import { useCallback, useEffect, useState } from 'react';

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
const pc = (v) => (v == null ? '—' : v + '%');
const ago = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };

export default function Admin() {
  const [d, setD] = useState(null);
  const [auth, setAuth] = useState(true);
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('pending');
  const [busy, setBusy] = useState(false);
  const [nt, setNt] = useState({ topic: '', text: '' });

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/data', { cache: 'no-store' });
    if (r.status === 401) { setAuth(false); return; }
    setAuth(true); setD(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function login(e) {
    e.preventDefault();
    const r = await post('/api/admin/login', { password: pw });
    if (r.ok) { setMsg(''); load(); } else setMsg((await r.json()).error || 'Login failed.');
  }
  const act = async (action, id) => { await post('/api/admin/lesson', { action, id }); load(); };
  async function learn() {
    setBusy(true); setMsg('');
    const r = await post('/api/admin/learn');
    const j = await r.json();
    setMsg(j.error ? j.error : `Analysed ${j.analyzed} interactions. ${j.added} new lessons, ${j.pulled} pulled from other agents.`);
    setBusy(false); load();
  }
  async function add(e) {
    e.preventDefault();
    await post('/api/admin/lesson', { action: 'add', ...nt }); setNt({ topic: '', text: '' }); setFilter('approved'); load();
  }

  if (!auth) return (
    <div className="adm"><form className="login" onSubmit={login}>
      <img src="/logo-mark.png" alt="" width="64" height="64" />
      <h1>SYNTH admin</h1>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Admin password" autoFocus />
      <button className="primary">Sign in</button>
      {msg && <p className="err">{msg}</p>}
    </form></div>
  );
  if (!d) return <div className="adm"><p className="empty">Loading…</p></div>;

  const s = d.stats, rated = s.up + s.down;
  const counts = (st) => d.lessons.filter((l) => l.status === st).length;
  const list = d.lessons.filter((l) => l.status === filter);

  return (
    <div className="adm">
      <header className="admbar">
        <h1>SYNTH learning dashboard</h1>
        <button className="primary" disabled={busy} onClick={learn}>{busy ? 'Learning…' : 'Run learning now'}</button>
      </header>
      <div className="health">
        {[['Storage', d.health.storage], ['Cron secret', d.health.cron]].map(([n, ok]) => <span key={n} className={'pill ' + (ok ? 'ok' : 'bad')}>{n}: {ok ? 'OK' : 'Missing'}</span>)}
        <span className={'pill ' + d.providers.openrouter.tone}>OpenRouter: {d.providers.openrouter.label}</span>
        <span className={'pill ' + d.providers.spark.tone}>SYNTHSPARK: {d.providers.spark.label}</span>
      </div>
      {!d.health.storage && <p className="err">Storage is not connected, so logs and lessons reset. Add Upstash Redis in Vercel (Storage tab) and redeploy.</p>}
      {d.providers.active.length === 0 && <p className="err">No AI provider is ready, so the assistant cannot answer. Add AI_API_KEY (OpenRouter) in Vercel and redeploy.</p>}
      {msg && <p className="note">{msg}</p>}

      <div className="stats">
        <div><b>{s.total}</b>interactions logged</div>
        <div><b>{s.last24h}</b>in the last 24 hours</div>
        <div><b>{rated ? Math.round((s.up / rated) * 100) + '%' : 'n/a'}</b>rated helpful ({rated} ratings)</div>
        <div><b>{counts('approved')}</b>active lessons</div>
        <div><b>{counts('pending')}</b>waiting for review</div>
      </div>
      <p className="muted">SYNTH ASSISTANT {s.chat}, SYNTHCODE {s.build}. Lessons by source: {Object.entries(d.bySource).map(([k, v]) => `${k} (${v})`).join(', ') || 'none yet'}. {d.lastResult ? 'Last learning run ' + ago(d.lastResult.ts) + '.' : 'Learning has not run yet.'}</p>

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
            <div><b>{l.topic}</b> <span className="muted">from {l.source}{l.by ? ' (' + l.by + ')' : ''}, {ago(l.ts)}</span><p>{l.text}</p></div>
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
        <h2>Provider health</h2>
        <p className="muted">Order: {d.providers.order.join(' → ')}. In use now: {d.providers.active.length ? d.providers.active.join(' → ') : 'none'}. OpenRouter is the default; the SPARK gateway is optional and never blocks the app.</p>
        {d.providers.notes.map((n, i) => <p key={i} className="note">{n}</p>)}
        <div className="scroll"><table>
          <thead><tr><th>Provider</th><th>State</th><th>Served (recent)</th><th>Failed attempts</th><th>Last success</th></tr></thead>
          <tbody>{[['OpenRouter (default)', d.providers.openrouter], ['SYNTHSPARK gateway (optional)', d.providers.spark]].map(([n, p]) => (
            <tr key={n}><td>{n}</td><td><span className={'pill ' + p.tone}>{p.label}</span></td><td>{p.served}</td><td>{p.failed}</td><td>{p.lastOk ? ago(p.lastOk) : '—'}</td></tr>
          ))}</tbody>
        </table></div>
      </section>

      <section>
        <h2>SYNTHSPARK Engine Diagnostics</h2>
        <p className="muted">Routing: {d.providers.active.length ? d.providers.active.join(' → ') : 'no provider ready'}. Every request is logged silently. Visitors never see any of this.</p>
        <div className="stats">
          <div><b>{d.spark.metrics.total}</b>requests logged</div>
          <div><b>{d.spark.metrics.total ? Math.round((d.spark.metrics.success / d.spark.metrics.total) * 100) + '%' : 'n/a'}</b>clean success</div>
          <div><b>{d.spark.metrics.fallback}</b>served after failover</div>
          <div><b>{d.spark.metrics.failed}</b>failed completely</div>
          <div><b>{d.spark.metrics.avgMs ? d.spark.metrics.avgMs + ' ms' : 'n/a'}</b>avg time to first token</div>
        </div>
        {d.spark.entries.length === 0 ? <p className="empty">No requests recorded yet.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Time</th><th>Task</th><th>Target node</th><th>Failovers</th><th>Latency</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>{d.spark.entries.map((x, i) => (
              <tr key={x.tid || i}>
                <td>{ago(x.ts)}</td>
                <td>{x.mode === 'build' ? 'SYNTHCODE' : 'ASSISTANT'}: {x.task}</td>
                <td>{x.node || '—'}</td>
                <td>{x.failovers}</td>
                <td>{x.ms} ms</td>
                <td><span className={'pill ' + (x.status === 'Success' ? 'ok' : x.status === 'Fallback' ? 'warn' : 'bad')}>{x.status}</span></td>
                <td className="muted">{x.fails && x.fails[0] ? x.fails[0].target + ': ' + x.fails[0].msg : ''}</td>
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
        <p className="muted">SYNTHCORE is the knowledge SYNTH builds from real use: which model handled which task, how reliably and how fast, how users rated it, and the lessons it wrote. The models themselves are not retrained. 100% means there is enough evidence to start routing by learned results. Targets are set in lib/core.js.</p>

        <h3>Task coverage</h3>
        {d.core.tasks.map((t) => (
          <div key={t.key} className="cover">
            <span>{t.label} <small className="muted">({t.lane})</small></span>
            <div className="bar"><i style={{ width: t.pct + '%' }} /></div>
            <b>{t.n}</b>
          </div>
        ))}

        <h3>Contribution by model</h3>
        {d.core.models.length === 0 ? <p className="empty">No training data yet. It builds up with every request.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Model</th><th>Training share</th><th>Served</th><th>Success</th><th>Helpful</th><th>Avg latency</th><th>Lessons</th><th>What it can do</th></tr></thead>
            <tbody>{d.core.models.map((m) => (
              <tr key={m.id}>
                <td>{m.id}</td>
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
          <thead><tr><th>When</th><th>Mode</th><th>Request</th><th>Rating</th></tr></thead>
          <tbody>{d.recent.map((e) => (
            <tr key={e.id}><td>{ago(e.ts)}</td><td>{e.mode}</td><td>{e.prompt.slice(0, 90)}</td><td>{e.fb === 1 ? 'Helpful' : e.fb === -1 ? 'Not helpful / error' : ''}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
