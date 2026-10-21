'use client';
import { useCallback, useEffect, useState } from 'react';

const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
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
        {[['AI key', d.health.key], ['Storage', d.health.storage], ['Cron secret', d.health.cron]].map(([n, ok]) => <span key={n} className={'pill ' + (ok ? 'ok' : 'bad')}>{n}: {ok ? 'OK' : 'Missing'}</span>)}
      </div>
      {!d.health.storage && <p className="err">Storage is not connected, so logs and lessons reset. Add Upstash Redis in Vercel (Storage tab) and redeploy.</p>}
      {!d.health.key && <p className="err">The AI key is missing or invalid, so the assistant cannot answer. Fix AI_API_KEY in Vercel and redeploy.</p>}
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
            <div><b>{l.topic}</b> <span className="muted">from {l.source}, {ago(l.ts)}</span><p>{l.text}</p></div>
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
