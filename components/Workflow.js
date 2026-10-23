// Visual "how it works" flow shown on the SYNTHCODE welcome screen (pure markup + CSS animation).
const STEPS = [
  { t: 'Describe', d: 'Type an idea, or add a screenshot or sketch.', v: (
    <div className="wfv"><span className="wf-bub">A habit tracker with streaks</span><div className="wf-att"><i className="wf-img" /><em>screenshot.png</em></div></div>
  ) },
  { t: 'Generate', d: 'SYNTHCODE writes a complete, working page, live.', v: (
    <div className="wfv">{[80, 54, 92, 46, 68].map((w, i) => <i key={i} className="wf-line" style={{ width: w + '%', animationDelay: i * 0.18 + 's' }} />)}</div>
  ) },
  { t: 'Preview', d: 'Check it on desktop, tablet and phone.', v: (
    <div className="wfv wf-dev"><b className="d1"><i /><i /></b><b className="d2"><i /></b><b className="d3"><i /></b></div>
  ) },
  { t: 'Refine', d: 'Ask for changes in plain words, then download.', v: (
    <div className="wfv"><span className="wf-bub">Make the buttons blue</span><span className="wf-bub ok">Done. Updated the page.</span></div>
  ) },
];

export default function Workflow() {
  return (
    <div className="wf" aria-label="How SYNTHCODE works">
      <p className="wf-title">How it works</p>
      <div className="wf-row">
        {STEPS.map((s, i) => (
          <div key={s.t} className="wf-step" style={{ '--i': i }}>
            <span className="wf-n">{i + 1}</span>
            {s.v}
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </div>
        ))}
      </div>
      <div className="wf-loop"><span>↻ Keep refining as long as you like</span></div>
    </div>
  );
}
