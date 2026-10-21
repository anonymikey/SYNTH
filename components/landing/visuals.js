'use client';
import { useEffect, useRef, useState } from 'react';
import { useSeen } from './bits';

/* ---------- animated workflow: idea -> route -> build -> preview ---------- */
export function Flow() {
  const steps = [
    { t: 'Describe', d: 'Type an idea or drop in a screenshot, sketch or mockup.', v: <div className="fv fv-1"><span>A habit tracker with streaks</span><i /><em /></div> },
    { t: 'Route', d: 'SYNTH picks the best free model and falls back if it is busy.', v: <div className="fv fv-2"><b className="busy">Model A  busy</b><b className="live">Model B  answering</b><b>Model C  standby</b></div> },
    { t: 'Build', d: 'The code streams in live as one self-contained page.', v: <div className="fv fv-3">{[80, 55, 90, 40, 70].map((w, i) => <i key={i} style={{ width: w + '%', animationDelay: i * 0.2 + 's' }} />)}</div> },
    { t: 'Preview', d: 'Test on desktop, tablet and phone. Download the file.', v: <div className="fv fv-4"><b /><b /><span /><span /></div> },
  ];
  return (
    <div className="flow">
      {steps.map((s, i) => (
        <div key={s.t} className="step" style={{ '--i': i }}>
          <div className="stepn">{i + 1}</div>
          {s.v}
          <h3>{s.t}</h3><p>{s.d}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- evolve loop ---------- */
export function EvolveLoop() {
  const nodes = [[200, 60, 'Use'], [340, 200, 'Rate'], [200, 340, 'Learn'], [60, 200, 'Approve']];
  return (
    <svg className="loop" viewBox="0 0 400 400" role="img" aria-label="Use, rate, learn, approve loop">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#22d3ee" /><stop offset=".5" stopColor="#4f8cff" /><stop offset="1" stopColor="#8b5cf6" /></linearGradient>
        <radialGradient id="lglow"><stop offset="0" stopColor="#4f8cff" stopOpacity=".35" /><stop offset="1" stopColor="#4f8cff" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#lglow)" />
      <circle className="ring" cx="200" cy="200" r="140" fill="none" stroke="url(#lg)" strokeWidth="2" strokeDasharray="4 10" />
      <circle cx="200" cy="200" r="104" fill="none" stroke="rgba(130,160,255,.2)" />
      <image href="/logo-mark.png" x="145" y="145" width="110" height="110" />
      <circle r="6" fill="#fff"><animateMotion dur="9s" repeatCount="indefinite" path="M200,60 A140,140 0 1 1 199.99,60" /></circle>
      {nodes.map(([x, y, t], i) => (
        <g key={t} className="lnode" style={{ animationDelay: i * 2.25 + 's' }}>
          <circle cx={x} cy={y} r="36" fill="#0d1430" stroke="url(#lg)" strokeWidth="2" />
          <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">{t}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- live demo window ---------- */
const SCRIPTS = [
  { p: 'A habit tracker with streaks', k: 'tracker' },
  { p: 'Landing page for a coffee shop', k: 'cafe' },
  { p: 'Pomodoro timer with sounds', k: 'timer' },
];
const Preview = ({ k }) => k === 'tracker'
  ? <div className="pv pv-tr"><h4>Habits</h4>{['Read', 'Run', 'Code'].map((h, r) => <div key={h}><span>{h}</span>{[1, 1, 1, 0, 1, 1, 0].map((on, i) => <i key={i} className={on && (i + r) % 5 !== 4 ? 'on' : ''} />)}</div>)}</div>
  : k === 'cafe'
    ? <div className="pv pv-cf"><div className="cfh" /><h4>Ember Coffee</h4><p>Small batch. Slow mornings.</p><b>Order now</b></div>
    : <div className="pv pv-tm"><div className="ring2"><span>25:00</span></div><b>Start focus</b></div>;

export function DemoWindow() {
  const ref = useRef(null);
  const seen = useSeen(ref, 0.3);
  const [s, setS] = useState(0), [n, setN] = useState(0), [ph, setPh] = useState('type');
  useEffect(() => {
    if (!seen) return;
    const full = SCRIPTS[s].p;
    let t;
    if (ph === 'type') t = n < full.length ? setTimeout(() => setN(n + 1), 55) : setTimeout(() => setPh('build'), 500);
    else if (ph === 'build') t = setTimeout(() => setPh('done'), 1800);
    else t = setTimeout(() => { setS((s + 1) % SCRIPTS.length); setN(0); setPh('type'); }, 3200);
    return () => clearTimeout(t);
  }, [seen, s, n, ph]);
  return (
    <div className="win" ref={ref}>
      <div className="wbar"><i /><i /><i /><span>synth / builder</span></div>
      <div className="wbody">
        <div className="wl">
          <div className="bubu">{SCRIPTS[s].p.slice(0, n)}{ph === 'type' && <u />}</div>
          {ph !== 'type' && <div className="buba">{ph === 'build' ? 'Building your page…' : 'Done. Want a dark mode or new colours?'}</div>}
          <div className="wcode">{[70, 40, 85, 55, 65, 35].map((w, i) => <i key={i} style={{ width: w + '%', opacity: ph === 'type' ? 0.15 : 1, animationDelay: i * 0.15 + 's' }} />)}</div>
        </div>
        <div className={'wr ' + ph}>{ph === 'done' ? <Preview k={SCRIPTS[s].k} /> : <div className="wload"><i /><i /><i /></div>}</div>
      </div>
    </div>
  );
}

/* ---------- feature card mocks ---------- */
export const MockBuilder = () => (
  <div className="mk mk-b"><div className="mkc">{[72, 46, 86, 60, 32, 78, 52].map((w, i) => <i key={i} style={{ width: w + '%', animationDelay: i * 0.15 + 's' }} />)}</div><div className="mkp"><b /><b /><span /><span /></div></div>
);
export const MockVision = () => (
  <div className="mk mk-v"><div className="shot"><i /><i /><i /><i /></div><span className="arr">→</span><div className="page"><b /><span /><span /></div></div>
);
export const MockFallback = () => (
  <div className="mk mk-f"><div><em className="bad" />Model A <small>busy</small></div><div className="on"><em className="ok" />Model B <small>answering</small></div><div><em />Model C <small>standby</small></div></div>
);
export const MockLearn = () => (
  <div className="mk mk-l"><div><span>Validate every form field</span><small className="ok">approved</small></div><div><span>Prefer semantic HTML</span><small>pending</small></div><div><span>Explain code briefly</span><small className="ok">approved</small></div></div>
);
export const MockAdmin = () => (
  <div className="mk mk-a"><div className="bars">{[30, 55, 40, 70, 60, 85, 75].map((h, i) => <i key={i} style={{ height: h + '%', animationDelay: i * 0.1 + 's' }} />)}</div><div className="kpi"><b>92%</b><small>rated helpful</small></div></div>
);
export const MockDevices = () => (
  <div className="mk mk-d"><div className="dv d1"><i /><i /><i /></div><div className="dv d2"><i /><i /></div><div className="dv d3"><i /><i /></div></div>
);
