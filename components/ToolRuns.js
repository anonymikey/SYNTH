import { Check, Close, Wrench } from '../lib/icons';

const first = (input) => { const v = Object.values(input || {}).find((x) => typeof x === 'string' || typeof x === 'number'); return v === undefined ? '' : String(v); };

// The tools used for an answer: one row each, with live state; open a row to see the input and a result preview.
export default function ToolRuns({ tools, compact }) {
  if (!tools || !tools.length) return null;
  return (
    <div className={'toolruns' + (compact ? ' compact' : '')} aria-label="Tools used">
      {tools.map((t) => (
        <details key={t.id} className={'tcall ' + t.state}>
          <summary>
            <span className="tico">{t.state === 'running' ? <i className="fspin" /> : t.state === 'done' ? <Check width="14" height="14" /> : <Close width="14" height="14" />}</span>
            <Wrench width="14" height="14" />
            <b>{t.label || t.tool}</b>
            <span className="tin">{first(t.input)}</span>
            <em>{t.state === 'running' ? 'working…' : (t.ms || 0) + ' ms'}</em>
          </summary>
          <div className="tbody">
            <small>Input</small>
            <pre>{JSON.stringify(t.input || {}, null, 2)}</pre>
            {t.state === 'done' && (<><small>{t.summary || 'Result'}</small><pre>{t.preview}</pre></>)}
            {t.state === 'error' && <p className="terr">{t.error}</p>}
          </div>
        </details>
      ))}
    </div>
  );
}
