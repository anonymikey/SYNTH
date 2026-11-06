'use client';
import { useRef, useState, useEffect } from 'react';
import { streamChat, applyToolEvent } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import VoiceInput from './VoiceInput';
import Markdown from './Markdown';
import ResponseToolbar from './ResponseToolbar';
import ToolRuns from './ToolRuns';
import { useFollow } from '../lib/follow';
import { Up, Stop, ArrowDown, Img } from '../lib/icons';
import { safeFrontendText } from '../lib/brand-view.js';

const SYSTEM = `You are SYNTH ASSISTANT: clear, concise and honest. Use Markdown (short paragraphs, lists, fenced code blocks with a language) when it helps.
When the user shares images: look closely, describe what is actually visible, transcribe any text exactly, read charts and tables carefully, and say so when something is unclear or cut off instead of guessing.`;
const IDEAS = ['Explain how neural networks learn, simply', 'Help me debug a problem in my code', 'Draft a polite follow-up email', 'Describe an image or screenshot I upload'];
const newId = () => globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

// Only the most recent image message (within the last 6 turns) keeps its pixels, to stay under request limits.
function toApi(msgs) {
  const last = msgs.map((m) => (m.images?.length ? 1 : 0)).lastIndexOf(1);
  return msgs.map((m, i) => ({ role: m.role, content: m.role === 'user' && i === last && i >= msgs.length - 6 ? withImages(m.content, m.images, 'Describe this image.') : m.content }));
}

export default function Chat({ seed }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [err, setErr] = useState('');
  const a = useAttach();
  const ctl = useRef(null);
  const mediaCtl = useRef(null);
  const busyRef = useRef(false);
  const mediaBusyRef = useRef(false);
  const sequence = useRef(0);
  const conversationId = useRef('');
  const box = useRef(null);
  const seeded = useRef(false);
  const follow = useFollow(msgs);

  function getConversationId() {
    if (!conversationId.current) conversationId.current = newId();
    return conversationId.current;
  }

  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; send(seed); } }, [seed]);
  useEffect(() => { const t = box.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [input]);

  async function runText(baseMessages, loggedPrompt, { replaceIndex = null, original = null } = {}) {
    if (busyRef.current || mediaBusyRef.current) return;
    busyRef.current = true;
    setBusy(true); setErr(''); follow.down(false);
    const runId = ++sequence.current;
    const clientId = newId();
    const expectedClientId = original?.clientId;
    const meta = {};
    let tools = [], latest = '';
    ctl.current = new AbortController();

    const patchTarget = (patch) => setMsgs((current) => {
      if (runId !== sequence.current) return current;
      if (replaceIndex == null) return [...baseMessages, { role: 'assistant', content: latest, tools, clientId, ...patch }];
      const existing = current[replaceIndex];
      if (!existing || existing.clientId !== clientId) return current;
      const next = current.slice();
      next[replaceIndex] = { ...existing, content: latest, tools, ...patch };
      return next;
    });

    if (replaceIndex == null) setMsgs([...baseMessages, { role: 'assistant', content: '', tools: [], clientId, complete: false }]);
    else setMsgs((current) => {
      if (runId !== sequence.current || current[replaceIndex]?.clientId !== expectedClientId) return current;
      const next = current.slice();
      next[replaceIndex] = { ...current[replaceIndex], content: '', tools: [], clientId, regenerating: true, complete: false };
      return next;
    });

    const show = () => patchTarget({ complete: false, ...(replaceIndex != null ? { regenerating: true } : {}) });
    try {
      const full = await streamChat({ messages: toApi(baseMessages), system: SYSTEM, mode: 'chat' }, (text) => { latest = text; show(); }, ctl.current.signal, meta, (event) => { tools = applyToolEvent(tools, event); show(); });
      const eventId = await track({
        mode: 'chat', prompt: loggedPrompt, reply: full, model: 'auto', tid: meta.tid,
        conversationId: getConversationId(), ...(original?.id ? { regeneratedFrom: original.id } : {}),
      });
      patchTarget({ id: eventId, complete: true, regenerating: false, fb: 0, feedback: null, ...(original?.id ? { regeneratedFrom: original.id } : {}) });
    } catch (error) {
      if (runId === sequence.current) {
        if (error.name === 'AbortError') {
          if (replaceIndex != null && original) {
            setMsgs((current) => current[replaceIndex]?.clientId === clientId ? current.map((item, index) => index === replaceIndex ? original : item) : current);
          } else {
            setMsgs(latest ? [...baseMessages, { role: 'assistant', content: latest, tools, clientId, complete: false, interrupted: true }] : baseMessages);
          }
        } else if (replaceIndex != null && original) {
          setMsgs((current) => current[replaceIndex]?.clientId === clientId ? current.map((item, index) => index === replaceIndex ? original : item) : current);
          setErr(safeFrontendText('Regeneration failed. The previous response is unchanged. ' + error.message.slice(0, 300)));
        } else {
          setMsgs(baseMessages);
          setErr(safeFrontendText(error.message.slice(0, 400)));
          track({ mode: 'chat', prompt: loggedPrompt, reply: '[ERROR] ' + error.message, model: 'auto', error: true, tid: meta.tid, conversationId: getConversationId() });
        }
      }
    } finally {
      if (runId === sequence.current) {
        busyRef.current = false; setBusy(false); ctl.current = null;
      }
    }
  }

  function send(override) {
    const text = (override ?? input).trim();
    if ((!text && !a.images.length) || busyRef.current || mediaBusyRef.current) return;
    const images = [...a.images];
    const next = [...msgs, { role: 'user', content: text, images }];
    const api = toApi(next);
    const hasImg = api.some((message) => Array.isArray(message.content));
    const logged = (text || 'image') + (hasImg ? ` [${images.length || 'earlier'} image]` : '');
    setInput(''); a.clear();
    runText(next, logged);
  }

  async function regenerateResponse(index) {
    if (busyRef.current || mediaBusyRef.current) return;
    const original = msgs[index];
    if (!original || original.role !== 'assistant' || !original.complete || original.regenerating) return;
    const prefix = msgs.slice(0, index);
    const userTurn = [...prefix].reverse().find((message) => message.role === 'user');
    if (!userTurn) { setErr('This response has no preceding user turn to regenerate from.'); return; }
    await runText(prefix, userTurn.content || '[image prompt]', { replaceIndex: index, original });
  }

  async function runImage(prompt, { next = null, replaceIndex = null, original = null } = {}) {
    if (busyRef.current || mediaBusyRef.current || !prompt.trim()) return;
    mediaBusyRef.current = true; setMediaBusy(true); setErr(''); setImageMode(false); follow.down(false);
    const runId = ++sequence.current;
    const clientId = newId();
    const expectedClientId = original?.clientId;
    const transcript = next || msgs;
    const ctlr = new AbortController();
    mediaCtl.current = ctlr;
    if (replaceIndex == null) setMsgs([...transcript, { role: 'assistant', content: '', generatingImage: true, clientId, complete: false }]);
    else setMsgs((current) => {
      if (current[replaceIndex]?.clientId !== expectedClientId) return current;
      const updated = current.slice();
      updated[replaceIndex] = { ...current[replaceIndex], content: '', generatedImage: null, generatingImage: true, regenerating: true, clientId, complete: false };
      return updated;
    });
    try {
      const response = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: prompt.trim() }), signal: ctlr.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(safeFrontendText(data.error || 'Image generation failed.'));
      const eventId = await track({ mode: 'chat', prompt: '[image generation request]', reply: '[generated image]', model: data.model || 'image-generation', tid: data.tid, conversationId: getConversationId(), ...(original?.id ? { regeneratedFrom: original.id } : {}) });
      const done = { role: 'assistant', content: 'Image generation complete. Use the download control above to save the generated image.', generatedImage: data.image, id: eventId, clientId, complete: true, fb: 0, feedback: null, ...(original?.id ? { regeneratedFrom: original.id } : {}) };
      if (runId === sequence.current) setMsgs((current) => {
        if (replaceIndex == null) return [...transcript, done];
        if (current[replaceIndex]?.clientId !== clientId) return current;
        const updated = current.slice(); updated[replaceIndex] = done; return updated;
      });
    } catch (error) {
      if (runId === sequence.current) {
        if (replaceIndex != null && original) setMsgs((current) => current[replaceIndex]?.clientId === clientId ? current.map((item, index) => index === replaceIndex ? original : item) : current);
        else setMsgs(transcript);
        if (error.name !== 'AbortError') setErr(safeFrontendText((replaceIndex != null ? 'Image regeneration failed; the previous image is unchanged. ' : '') + error.message.slice(0, 350)));
      }
    } finally {
      if (runId === sequence.current) { mediaBusyRef.current = false; setMediaBusy(false); mediaCtl.current = null; }
    }
  }

  function generateImage() {
    const prompt = input.trim();
    if (!prompt || busyRef.current || mediaBusyRef.current) return;
    const next = [...msgs, { role: 'user', content: `Create an image: ${prompt}` }];
    setInput(''); a.clear();
    runImage(prompt, { next });
  }

  async function regenerateImage(index) {
    if (busyRef.current || mediaBusyRef.current) return;
    const original = msgs[index];
    if (!original || original.role !== 'assistant' || !original.complete || !original.generatedImage) return;
    const prefix = msgs.slice(0, index);
    const userTurn = [...prefix].reverse().find((message) => message.role === 'user');
    const prompt = String(userTurn?.content || '').replace(/^Create an image:\s*/i, '').trim();
    if (!prompt) { setErr('The original image prompt could not be recovered from this chat.'); return; }
    await runImage(prompt, { replaceIndex: index, original });
  }

  function clearChat() {
    sequence.current++;
    ctl.current?.abort(); mediaCtl.current?.abort();
    ctl.current = null; mediaCtl.current = null;
    busyRef.current = false; mediaBusyRef.current = false;
    setBusy(false); setMediaBusy(false); setMsgs([]); setErr(''); setInput('');
    conversationId.current = '';
  }

  function saveFeedback(id, value, feedback) {
    setMsgs((current) => current.map((message) => message.id === id ? { ...message, fb: value, feedback } : message));
  }

  return (
    <section className="chat" {...(!imageMode ? a.dropProps : {})}>
      <div className="logwrap">
        <div className="log" ref={follow.ref} onScroll={follow.onScroll}>
          {msgs.length === 0 && (
            <div className="welcome">
              <img src="/logo.png" alt="SYNTH: think, build, evolve" />
              <h2>What shall we think through?</h2>
              <p>Ask anything, or drop in an image and ask about it.</p>
              <div className="chips">{IDEAS.map((text) => <button key={text} className="chip" onClick={() => send(text)}>{text}</button>)}</div>
            </div>
          )}
          {msgs.map((message, index) => (
            <div key={message.clientId || index} className={'m ' + message.role}>
              {message.role === 'assistant' && <img className="av" src="/logo-mark.png" alt="" />}
              <div className="bub" id={message.id ? 'response-' + message.id : undefined}>
                {message.images?.map((src, imageIndex) => <img key={imageIndex} src={src} className="mimg" alt="Uploaded" />)}
                {message.generatedImage && <a className="generated-image" href={message.generatedImage} download="synth-generated-image.png"><img src={message.generatedImage} className="mimg" alt="Generated by SYNTH" /><span>Download image</span></a>}
                {message.role === 'assistant' && message.tools?.length > 0 && <ToolRuns tools={message.tools} />}
                {message.generatingImage ? <p className="media-progress" role="status">Creating your image with SYNTH Image Master…</p> : message.role === 'assistant' ? (message.content ? <Markdown text={message.content} /> : <span className="typing" role="status" aria-label="Thinking"><i /><i /><i /></span>) : message.content}
                {message.regenerating && <p className="regen-progress" role="status"><span className="response-spinner" />Regenerating this response with the preceding conversation context…</p>}
                {message.complete && !message.regenerating && <ResponseToolbar
                  key={message.clientId || message.id || index}
                  id={message.id}
                  response={message.content}
                  messageKey={message.clientId || message.id}
                  imageResponse={!!message.generatedImage}
                  initialRating={message.fb}
                  initialFeedback={message.feedback}
                  onRegenerate={() => message.generatedImage ? regenerateImage(index) : regenerateResponse(index)}
                  disabled={busy || mediaBusy}
                  regenerating={message.regenerating}
                  regeneratedFrom={message.regeneratedFrom}
                  onFeedbackSaved={saveFeedback}
                />}
              </div>
            </div>
          ))}
        </div>
        {follow.away && <button className={'godown' + (busy ? ' live' : '')} onClick={() => follow.down()} aria-label="Scroll to latest message"><ArrowDown width="18" height="18" /></button>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      {!imageMode && <Thumbs a={a} />}
      <div className="compose compose-stack">
        <textarea ref={box} value={input} placeholder={imageMode ? 'Describe the image to create' : 'Message SYNTH, paste an image, or record voice'} rows={1} aria-label={imageMode ? 'Describe an image to generate' : 'Message'}
          onChange={(event) => setInput(event.target.value)} onPaste={!imageMode ? a.onPaste : undefined}
          onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); imageMode ? generateImage() : send(); } }} />
        <div className="compose-toolbar">
          <div className="toolbar-cluster" role="group" aria-label="Message tools">
            {!imageMode && <AttachButton a={a} />}
            <button type="button" className={'toolbar-chip modebtn' + (imageMode ? ' on' : '')} onClick={() => { setImageMode((value) => !value); a.clear(); }} disabled={busy || mediaBusy}
              aria-label={imageMode ? 'Switch to chat' : 'Create an image'} title={imageMode ? 'Switch back to chat' : 'Generate an image with SYNTH Image Master'}><Img width="16" height="16" /><span className="toolbar-label">{imageMode ? 'Image mode' : 'Create image'}</span></button>
          </div>
          <span className="toolbar-spacer" />
          {!imageMode && <VoiceInput onText={(text) => setInput((value) => value ? `${value} ${text}` : text)} disabled={busy || mediaBusy} />}
          {mediaBusy
            ? <button type="button" className="iconbtn compose-submit" onClick={() => mediaCtl.current?.abort()} aria-label="Stop image generation"><Stop /></button>
            : busy
              ? <button type="button" className="iconbtn compose-submit" onClick={() => ctl.current?.abort()} aria-label="Stop response"><Stop /></button>
              : <button type="button" className="iconbtn primary compose-submit" onClick={() => imageMode ? generateImage() : send()} aria-label={imageMode ? 'Generate image' : 'Send'} disabled={!input.trim() && (imageMode || !a.images.length)}>{imageMode ? <Img /> : <Up />}</button>}
        </div>
      </div>
      <p className="tools"><span>Optional image and voice tools use connected services; account limits and charges may apply. Avoid personal or confidential data.</span>{msgs.length > 0 && <button className="linkbtn" onClick={clearChat}>Clear chat</button>}</p>
    </section>
  );
}
