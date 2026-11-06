'use client';
import { useEffect, useRef, useState } from 'react';
import { rate } from '../lib/track';
import { Check, Copy, More, Play, Refresh, Share, ThumbsDown, ThumbsUp, Volume, Close } from '../lib/icons';

const CATEGORIES = [
  ['inaccurate', 'Inaccurate information'],
  ['poor-explanation', 'Poor explanation'],
  ['irrelevant', 'Irrelevant response'],
  ['incomplete', 'Incomplete answer'],
  ['other', 'Other'],
];
const SPEECH_EVENT = 'synth-response-speech-state';
let activeSpeech = null;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; } catch {}
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.appendChild(field);
  field.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } finally { field.remove(); }
  if (!ok) throw new Error('Clipboard access is unavailable. Select and copy the response manually.');
  return true;
}

function spokenText(text) {
  return String(text)
    .replace(/```[\w-]*\n([\s\S]*?)```/g, 'Code block. $1. End code block.')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/[`*_#>]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .trim();
}

export default function ResponseToolbar({
  id, response = '', messageKey, imageResponse = false, initialRating = 0, initialFeedback = null,
  onRegenerate, regenerateDescription = '', showRegenerate = true, disabled = false, regenerating = false, regeneratedFrom = '', onFeedbackSaved,
}) {
  const [rating, setRating] = useState(initialRating || 0);
  const [category, setCategory] = useState(initialFeedback?.category || '');
  const [comment, setComment] = useState(initialFeedback?.comment || '');
  const [panel, setPanel] = useState('');
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [speech, setSpeech] = useState('idle');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState('ok');
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const root = useRef(null);
  const savingRef = useRef(false);
  const noticeTimer = useRef(null);
  const speechKey = String(messageKey || id || 'response');

  useEffect(() => {
    setRating(initialRating || 0);
    setCategory(initialFeedback?.category || '');
    setComment(initialFeedback?.comment || '');
    setSpeechSupported('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window);
  }, [id]);

  useEffect(() => {
    const onSpeechState = (event) => {
      const detail = event.detail || {};
      if (detail.key === speechKey) setSpeech(detail.state);
      else if (detail.state === 'speaking') setSpeech('idle');
    };
    const onPointer = (event) => { if (root.current && !root.current.contains(event.target)) { setPanel(''); setMenu(false); } };
    const onKey = (event) => { if (event.key === 'Escape') { setPanel(''); setMenu(false); } };
    window.addEventListener(SPEECH_EVENT, onSpeechState);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(SPEECH_EVENT, onSpeechState);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      clearTimeout(noticeTimer.current);
      if (activeSpeech?.key === speechKey) { activeSpeech.synth.cancel(); activeSpeech = null; }
    };
  }, [speechKey]);

  function announce(text, type = 'ok') {
    setNotice(text); setNoticeType(type);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3600);
  }

  async function copyResponse() {
    try { await copyText(response); announce('Response copied to clipboard.'); }
    catch (error) { announce(error.message || 'Copy failed. You can select the response and copy it manually.', 'error'); }
  }

  async function saveRating(value, nextCategory = '', nextComment = '') {
    if (!id) { announce('This response could not be linked to feedback right now.', 'error'); return; }
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try {
      const result = await rate(id, value, { category: value === -1 ? nextCategory : '', comment: value === -1 ? nextComment : '' });
      if (!result?.ok) throw new Error(result?.error || 'Feedback could not be saved. Please try again.');
      const savedCategory = result.feedback?.category || '';
      const savedComment = result.feedback?.comment || '';
      setRating(result.value);
      setCategory(savedCategory);
      setComment(savedComment);
      onFeedbackSaved?.(id, result.value, result.feedback || null);
      setPanel('feedback-saved'); setMenu(false);
    } catch (error) { announce(error.message, 'error'); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function openNegativeFeedback() {
    setCategory(category || 'inaccurate');
    setPanel('feedback'); setMenu(false);
  }

  function toggleSpeech() {
    if (!speechSupported) { announce('Read aloud is not supported by this browser.', 'error'); return; }
    const synth = window.speechSynthesis;
    if (speech === 'speaking') { synth.pause(); setSpeech('paused'); return; }
    if (speech === 'paused') { synth.resume(); setSpeech('speaking'); return; }
    if (activeSpeech) {
      activeSpeech.synth.cancel();
      window.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: { key: activeSpeech.key, state: 'idle' } }));
    }
    const utterance = new SpeechSynthesisUtterance(spokenText(response));
    const update = (state) => {
      if (activeSpeech?.utterance === utterance) {
        setSpeech(state);
        window.dispatchEvent(new CustomEvent(SPEECH_EVENT, { detail: { key: speechKey, state } }));
      }
    };
    utterance.onstart = () => update('speaking');
    utterance.onpause = () => update('paused');
    utterance.onresume = () => update('speaking');
    utterance.onend = () => { update('idle'); if (activeSpeech?.utterance === utterance) activeSpeech = null; };
    utterance.onerror = (event) => { update('idle'); if (activeSpeech?.utterance === utterance) activeSpeech = null; if (!['canceled', 'interrupted'].includes(event.error)) announce('Speech playback stopped because the browser reported an error.', 'error'); };
    activeSpeech = { key: speechKey, synth, utterance };
    synth.speak(utterance);
  }

  function stopSpeech() {
    if (activeSpeech?.key === speechKey) { activeSpeech.synth.cancel(); activeSpeech = null; }
    setSpeech('idle');
  }

  async function shareResponse() {
    setMenu(false);
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: 'SYNTH response', text: response }); announce('Shared using your device share sheet.'); return; }
      catch (error) { if (error?.name === 'AbortError') return; }
    }
    setShareError(''); setShareUrl(''); setLinkCopied(false); setPanel('share');
  }

  async function createShareLink() {
    if (shareBusy) return;
    setShareBusy(true); setShareError('');
    try {
      const res = await fetch('/api/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response, consent: true }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'A secure share link is unavailable.');
      const url = new URL(data.path, window.location.origin).toString();
      setShareUrl(url);
      try { await copyText(url); setLinkCopied(true); announce('Unlisted 24-hour response link copied.'); }
      catch { setLinkCopied(false); announce('Unlisted link created. Use the copy-link control below.', 'info'); }
    } catch (error) { setShareError(error.message || 'A secure share link could not be created.'); }
    finally { setShareBusy(false); }
  }

  async function copyShareLink() {
    try { await copyText(shareUrl); setLinkCopied(true); announce('Unlisted response link copied.'); }
    catch (error) { announce(error.message, 'error'); }
  }

  const words = response.trim() ? response.trim().split(/\s+/).length : 0;
  const chars = response.length;
  return (
    <div className="response-tools" ref={root}>
      <div className="response-actions" role="toolbar" aria-label="Response actions">
        <button type="button" className="response-action" onClick={copyResponse} title="Copy the complete response" aria-label="Copy response"><Copy /><span>Copy</span></button>
        <button type="button" className={'response-action' + (rating === 1 ? ' selected positive' : '')} onClick={() => saveRating(rating === 1 ? 0 : 1)} disabled={saving || !id} aria-pressed={rating === 1} title={!id ? 'Feedback unavailable for this response' : 'Rate this response helpful'} aria-label="Like response"><ThumbsUp /><span>Like</span></button>
        <button type="button" className={'response-action' + (rating === -1 ? ' selected negative' : '')} onClick={openNegativeFeedback} disabled={saving || !id} aria-pressed={rating === -1} title={!id ? 'Feedback unavailable for this response' : 'Tell SYNTH what could be improved'} aria-label="Dislike response"><ThumbsDown /><span>Dislike</span></button>
        <span className="response-action-voice">
          <button type="button" className={'response-action' + (speech === 'speaking' ? ' speaking' : '')} onClick={toggleSpeech} disabled={!speechSupported} aria-label={speech === 'speaking' ? 'Pause read aloud' : speech === 'paused' ? 'Resume read aloud' : 'Read response aloud'} aria-pressed={speech === 'speaking'} title={speechSupported ? (speech === 'paused' ? 'Resume reading' : speech === 'speaking' ? 'Pause reading' : 'Read response aloud') : 'Read aloud is not supported in this browser'}>
            {speech === 'paused' ? <Play /> : <Volume />}{speech === 'speaking' && <span className="speech-wave" aria-hidden="true"><i /><i /><i /></span>}<span>{speech === 'paused' ? 'Resume' : speech === 'speaking' ? 'Pause' : 'Read aloud'}</span>
          </button>
          {(speech === 'speaking' || speech === 'paused') && <button type="button" className="response-stop" onClick={stopSpeech} aria-label="Stop read aloud" title="Stop reading">■</button>}
        </span>
        <button type="button" className="response-action" onClick={shareResponse} title="Share this response only" aria-label="Share response"><Share /><span>Share</span></button>
        {showRegenerate && <button type="button" className="response-action" onClick={onRegenerate} disabled={!onRegenerate || disabled || regenerating} title={regenerateDescription || (imageResponse ? 'Regenerate this image from its original prompt' : 'Regenerate this response using prior conversation context')} aria-label="Regenerate response">{regenerating ? <span className="response-spinner" /> : <Refresh />}<span>{regenerating ? 'Regenerating' : 'Regenerate'}</span></button>}
        <span className="response-menu-wrap">
          <button type="button" className="response-action response-more" onClick={() => { setMenu((value) => !value); setPanel(''); }} aria-expanded={menu} aria-haspopup="menu" aria-label="More response actions" title="More response actions"><More /></button>
          {menu && <div className="response-more-menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { setPanel('details'); setMenu(false); }}>Response details</button>
            {id && <button type="button" role="menuitem" onClick={() => { setMenu(false); copyText(id).then(() => announce('Response ID copied.')).catch(() => announce('Could not copy the response ID.', 'error')); }}>Copy response ID</button>}
            {id && <button type="button" role="menuitem" onClick={openNegativeFeedback}>Report a problem</button>}
            <button type="button" role="menuitem" onClick={() => { setMenu(false); setShareError(''); setShareUrl(''); setLinkCopied(false); setPanel('share'); }}>Create an unlisted share link</button>
          </div>}
        </span>
      </div>
      {notice && <p className={'response-notice ' + noticeType} role="status"><Check />{notice}</p>}
      {panel === 'feedback' && <section className="response-popover feedback-popover" aria-label="Response feedback">
        <button type="button" className="response-pop-close" onClick={() => setPanel('')} aria-label="Close feedback"><Close /></button>
        <p className="response-pop-eyebrow">HELP US IMPROVE</p><h4>What could be better?</h4>
        <fieldset className="feedback-categories"><legend>Choose the closest match</legend>{CATEGORIES.map(([value, label]) => <label key={value}><input type="radio" name={'feedback-' + (id || speechKey)} value={value} checked={(category || 'inaccurate') === value} onChange={() => setCategory(value)} /><span>{label}</span></label>)}</fieldset>
        <label className="feedback-comment-label" htmlFor={'feedback-comment-' + (id || speechKey)}>Anything else? <span>Optional</span></label>
        <textarea id={'feedback-comment-' + (id || speechKey)} value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} placeholder="A brief note helps us improve this kind of answer." />
        <p className="feedback-privacy">Feedback may be reviewed in the SYNTH Learning Studio. Please avoid personal information.</p>
        <div className="response-pop-actions"><button type="button" className="response-secondary" onClick={() => setPanel('')} disabled={saving}>Cancel</button>{rating !== 0 && <button type="button" className="response-secondary" onClick={() => saveRating(0)} disabled={saving}>Remove rating</button>}<button type="button" className="response-primary" onClick={() => saveRating(-1, category || 'inaccurate', comment)} disabled={saving}>{saving ? <><span className="response-spinner" />Saving…</> : 'Send feedback'}</button></div>
      </section>}
      {panel === 'feedback-saved' && <section className="response-popover feedback-success" role="status"><button type="button" className="response-pop-close" onClick={() => setPanel('')} aria-label="Close confirmation"><Close /></button><span className="feedback-success-mark"><Check /></span><h4>{rating === 1 ? 'Thanks for the feedback.' : rating === -1 ? 'Thanks for helping us improve.' : 'Your rating was removed.'}</h4><p>{rating === -1 ? 'Your category and note were saved for the SYNTH Learning Studio.' : 'Your rating is saved with this response.'}</p><button type="button" className="response-secondary" onClick={openNegativeFeedback}>Change feedback</button></section>}
      {panel === 'share' && <section className="response-popover share-popover" aria-label="Share this response">
        <button type="button" className="response-pop-close" onClick={() => setPanel('')} aria-label="Close sharing"><Close /></button>
        <p className="response-pop-eyebrow">SHARE ONE RESPONSE</p><h4>Keep the rest of your chat private.</h4>
        <p>Only this answer is included—never the prompt or conversation history. This unlisted link can be opened by anyone who receives it and expires after 24 hours. Review the answer before sharing.{imageResponse ? ' The generated image file is not included; use its Download image control to share the image itself.' : ''}</p>
        {shareError && <p className="response-error" role="alert">{shareError}</p>}
        {shareUrl ? <div className="share-link-row"><input aria-label="Unlisted response link" readOnly value={shareUrl} /><button type="button" className="response-primary" onClick={copyShareLink}>{linkCopied ? 'Copied' : 'Copy link'}</button></div> : <div className="response-pop-actions"><button type="button" className="response-secondary" onClick={() => setPanel('')}>Cancel</button><button type="button" className="response-primary" onClick={createShareLink} disabled={shareBusy}>{shareBusy ? <><span className="response-spinner" />Creating…</> : 'Create 24-hour link'}</button></div>}
        <button type="button" className="response-copy-fallback" onClick={() => { setPanel(''); copyResponse(); }}>Copy response text instead</button>
      </section>}
      {panel === 'details' && <section className="response-popover response-details" aria-label="Response details">
        <button type="button" className="response-pop-close" onClick={() => setPanel('')} aria-label="Close details"><Close /></button><p className="response-pop-eyebrow">RESPONSE DETAILS</p><h4>About this answer</h4>
        <dl><div><dt>Length</dt><dd>{words.toLocaleString()} words · {chars.toLocaleString()} characters</dd></div><div><dt>Response ID</dt><dd>{id || 'Not available'}</dd></div>{regeneratedFrom && <div><dt>Regenerated from</dt><dd>{regeneratedFrom}</dd></div>}<div><dt>Conversation data</dt><dd>The full thread remains in this browser session; a redacted prompt/response summary may be recorded for the SYNTH Learning Studio and SYNTHCORE.</dd></div></dl>
        {id && <button type="button" className="response-copy-fallback" onClick={() => copyText(id).then(() => { setPanel(''); announce('Response ID copied.'); }).catch(() => announce('Could not copy the response ID.', 'error'))}>Copy response ID</button>}
      </section>}
    </div>
  );
}
