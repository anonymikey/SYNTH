'use client';

import { useEffect, useRef } from 'react';
import { Close } from '../lib/icons';

function excerpt(value) {
  const text = String(value || '');
  const limit = 520;
  if (!text) return '(empty file)';
  return text.length > limit ? `${text.slice(0, limit)}\n… preview truncated` : text;
}

export default function BuilderApprovalDialog({ request, review, onCancelRequest, onProceed, onDiscard, onApply }) {
  const dialog = useRef(null);
  const active = request || review;
  const actions = useRef({});
  actions.current = { onCancelRequest, onDiscard };

  useEffect(() => {
    if (!active) return undefined;
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('button:not(:disabled)')?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (request) actions.current.onCancelRequest?.();
        else actions.current.onDiscard?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll('button:not(:disabled)') || [])];
      if (!controls.length) return;
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [active, request]);

  if (!active) return null;
  const isReview = Boolean(review);
  const changes = Array.isArray(review?.changes) ? review.changes : [];
  const paths = changes.slice(0, 4);

  return (
    <div className="builder-approval-backdrop" onMouseDown={(event) => {
      if (event.target !== event.currentTarget) return;
      if (!isReview) onCancelRequest();
    }}>
      <section className="builder-approval-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="builder-approval-title" aria-describedby="builder-approval-copy">
        <button type="button" className="builder-approval-close" onClick={isReview ? onDiscard : onCancelRequest} aria-label="Close confirmation"><Close width="18" height="18" /></button>
        <span className="builder-approval-kicker">{isReview ? 'SENSITIVE FILE REVIEW' : 'BEFORE SYNTHCODE PROCEEDS'}</span>
        <div className="builder-approval-mark" aria-hidden="true">{isReview ? '!' : '?'}</div>
        <h2 id="builder-approval-title">{isReview ? 'Review these proposed changes' : 'Would you like SYNTHCODE to continue?'}</h2>
        <p id="builder-approval-copy" className="builder-approval-reason">{isReview ? 'These files are still unchanged. Review the paths and choose whether to apply this proposal.' : request.reason}</p>
        {request && <blockquote className="builder-approval-request">{request.text}</blockquote>}
        {isReview && (
          <div className="builder-approval-files" aria-label="Proposed sensitive files">
            {paths.map((change) => (
              <article className="builder-approval-file" key={`${change.kind}:${change.path}`}>
                <header><span>{change.kind === 'new' ? 'New' : change.kind === 'del' ? 'Remove' : 'Edit'}</span><code>{change.path}</code></header>
                {change.kind !== 'new' && <div className="builder-approval-snippet"><small>Current</small><pre>{excerpt(review.originalFiles?.[change.path])}</pre></div>}
                {change.kind !== 'del' && <div className="builder-approval-snippet proposed"><small>Proposed</small><pre>{excerpt(review.files?.[change.path])}</pre></div>}
              </article>
            ))}
            {changes.length > paths.length && <small>And {changes.length - paths.length} more changed file{changes.length - paths.length === 1 ? '' : 's'}</small>}
          </div>
        )}
        <p className="builder-approval-boundary">{isReview ? 'Applying updates only the SYNTHCODE working copy. It does not publish, run, merge or deploy the project.' : 'Nothing has been generated or changed yet. Continuing sends your request and the supplied project context to SYNTHCODE’s configured AI service.'}</p>
        <div className="builder-approval-actions">
          <button type="button" className="builder-approval-secondary" onClick={isReview ? onDiscard : onCancelRequest}>{isReview ? 'Keep current project' : 'Not now'}</button>
          <button type="button" className="builder-approval-primary" onClick={isReview ? onApply : onProceed}>{isReview ? 'Apply reviewed changes' : 'Yes, proceed'}</button>
        </div>
      </section>
    </div>
  );
}
