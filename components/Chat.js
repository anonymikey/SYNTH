'use client';
import { useRef, useState, useEffect } from 'react';
import { streamChat } from '../lib/stream';
import { track } from '../lib/track';
import { idsFor, withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';

const SYSTEM = `You are SYNTHAI Assistant: clear, concise and honest.
When the user shares images: look closely, describe what is actually visible, transcribe any text exactly, read charts and tables carefully, and say so when something is unclear or cut off instead of guessing.`;

// Only the most recent image message (within the last 6 turns) keeps its pixels, to stay under request limits.
function toApi(msgs) {
  const last = msgs.map((m) => (m.images?.length ? 1 : 0)).lastIndexOf(1);
  return msgs.map((m, i) => ({ role: m.role, content: m.role === 'user' && i === last && i >= msgs.length - 6 ? withImages(m.content, m.images, 'Describe this image.') : m.content }));
}

export default function Chat({ models }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const a = useAttach();
  const ctl = useRef(null);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs]);

  async function send() {
    const text = input.trim();
    if ((!text && !a.images.length) || busy) return;
    const next = [...msgs, { role: 'user', content: text, images: a.images }];
    const api = toApi(next);
    const hasImg = api.some((m) => Array.isArray(m.content));
    const ids = idsFor(models, hasImg);
    setInput(''); setErr(''); a.clear();
    if (!ids.length) { setMsgs(next); setErr('No image-capable free model is available right now. Try again later or switch provider.'); return; }
    setMsgs([...next, { role: 'assistant', content: '' }]); setBusy(true);
    ctl.current = new AbortController();
    const logged = (text || 'image') + (hasImg ? ` [${a.images.length || 'earlier'} image]` : '');
    try {
      const full = await streamChat({ messages: api, models: ids, system: SYSTEM }, (t) => setMsgs([...next, { role: 'assistant', content: t }]), ctl.current.signal);
      const id = await track({ mode: 'chat', prompt: logged, reply: full, model: ids[0] });
      setMsgs([...next, { role: 'assistant', content: full, id }]);
    } catch (e) {
      if (e.name !== 'AbortError') { setErr(e.message.slice(0, 300)); track({ mode: 'chat', prompt: logged, reply: '[ERROR] ' + e.message, model: ids[0], error: true }); }
    }
    setBusy(false);
  }

  return (
    <section className="chat" {...a.dropProps}>
      <div className="log">
        {msgs.length === 0 && (<div className="welcome"><img src="/logo.png" alt="SYNTHAI: think, build, evolve" /><p>Ask anything, or add an image (button, paste or drop) and ask about it. If a free model is busy, the next one answers instead.</p></div>)}
        {msgs.map((m, i) => (
          <div key={i} className={'msg ' + m.role}>
            {m.images?.map((s, j) => <img key={j} src={s} className="mimg" alt="Uploaded" />)}
            {m.content || (m.role === 'assistant' ? '…' : '')}
            {m.id && <Rate id={m.id} />}
          </div>
        ))}
        <div ref={end} />
      </div>
      {err && <p className="err">{err}</p>}
      <Thumbs a={a} />
      <div className="compose">
        <textarea value={input} placeholder="Message, or paste an image" rows={2}
          onChange={(e) => setInput(e.target.value)} onPaste={a.onPaste}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <AttachButton a={a} />
        {busy ? <button onClick={() => ctl.current?.abort()}>Stop</button> : <button className="primary" onClick={send}>Send</button>}
        <button onClick={() => { setMsgs([]); setErr(''); }}>Clear</button>
      </div>
    </section>
  );
}
