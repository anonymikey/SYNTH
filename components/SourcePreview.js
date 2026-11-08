import { sanitizeSources } from '../lib/sources';

export function SourceCards({ sources }) {
  const items = sanitizeSources(sources);
  if (!items.length) return null;
  return (
    <div className="source-preview-cards" role="list">
      {items.map((source) => (
        <article className="source-preview-card" role="listitem" key={source.url}>
          <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${source.title} on ${source.host} in a new tab`}>
            <span className="source-preview-top"><strong>{source.title}</strong><span className="source-preview-host">{source.host}</span></span>
            {source.snippet && <span className="source-preview-snippet">{source.snippet}</span>}
            <span className="source-preview-open">Open page <span aria-hidden="true">↗</span></span>
          </a>
        </article>
      ))}
    </div>
  );
}

export default function SourcesDisclosure({ sources }) {
  const items = sanitizeSources(sources);
  if (!items.length) return null;
  return (
    <details className="sources-disclosure">
      <summary>
        <span className="sources-disclosure-mark" aria-hidden="true"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.1" /><path d="M2.9 10h14.2M10 2.9c2.1 2 3.1 4.3 3.1 7.1s-1 5.1-3.1 7.1c-2.1-2-3.1-4.3-3.1-7.1s1-5.1 3.1-7.1Z" /></svg></span>
        <span>Sources</span>
        <span className="sources-disclosure-count">{items.length}</span>
        <svg className="sources-disclosure-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m5 7.5 5 5 5-5" /></svg>
      </summary>
      <div className="sources-disclosure-body">
        <p className="sources-disclosure-note">Website sources used for this answer</p>
        <SourceCards sources={items} />
      </div>
    </details>
  );
}
