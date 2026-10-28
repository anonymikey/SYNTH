'use client';
import { useRef, useState, useEffect } from 'react';
import { streamChat, applyToolEvent } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Markdown from './Markdown';
import Rate from './Rate';
import ToolRuns from './ToolRuns';
import { useFollow } from '../lib/follow';
import { Up, Stop, ArrowDown } from '../lib/icons';

const SYSTEM = `You are SYNTH ASSISTANT: clear, concise and honest. Use Markdown (short paragraphs, lists, fenced code blocks with a language) when it helps.
When the user shares images: look closely, describe what is actually visible, transcribe any text exactly, read charts and tables carefully, and say so when something is unclear or cut off instead of guessing.`;
const IDEAS = ['Explain how neural networks learn, simply', 'Help me debug a problem in my code', 'Draft a polite follow-up email', 'Describe an image or screenshot I upload'];

// Only the most recent image message (within the last 6 turns) keeps its pixels, to stay under request limits.
function toApi(msgs) {
  const last = msgs.map((m) => (m.images?.length ? 1 : 0)).lastIndexOf(1);
  return msgs.map((m, i) => ({ role: m.role, content: m.role === 'user' && i === last && i >= msgs.length - 6 ? withImages(m.content, m.images, 'Describe this image.') : m.content }));
}

export default function Chat({ seed }) {
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const a = useAttach();
  const ctl = useRef(null);
  const box = useRef(null);
  const seeded = useRef(false);
  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; send(seed); } }, [seed]);
  const follow = useFollow(msgs);
  useEffect(() => { const t = box.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [input]);

  async function send(override) {
    const text = (override ?? input).trim();
    if ((!text && !a.images.length) || busy) return;
    follow.down(false); // sending always jumps to the newest message
    const next = [...msgs, { role: 'user', content: text, images: a.images }];
    const api = toApi(next);
    const hasImg = api.some((m) => Array.isArray(m.content));
    const n = a.images.length;
    setInput(''); setErr(''); a.clear();
    setMsgs([...next, { role: 'assistant', content: '' }]); setBusy(true);
    ctl.current = new AbortController();
    const logged = (text || 'image') + (hasImg ? ` [${n || 'earlier'} image]` : '');
    const meta = {};
    let tools = [], latest = '';
    const show = () => setMsgs([...next, { role: 'assistant', content: latest, tools }]);
    try {
      const full = await streamChat({ messages: api, system: SYSTEM, mode: 'chat' }, (t) => { latest = t; show(); }, ctl.current.signal, meta, (ev) => { tools = applyToolEvent(tools, ev); show(); });
      const id = await track({ mode: 'chat', prompt: logged, reply: full, model: 'auto', tid: meta.tid });
      setMsgs([...next, { role: 'assistant', content: full, tools, id }]);
    } catch (e) {
      if (e.name !== 'AbortError') { setMsgs(next); setErr(e.message.slice(0, 400)); track({ mode: 'chat', prompt: logged, reply: '[ERROR] ' + e.message, model: 'auto', error: true }); }
    }
    setBusy(false);
  }

  return (
    <section className="chat" {...a.dropProps}>
      <div className="logwrap">
      <div className="log" ref={follow.ref} onScroll={follow.onScroll}>
        {msgs.length === 0 && (
          <div className="welcome">
            <img src="/logo.png" alt="SYNTH: think, build, evolve" />
            <h2>What shall we think through?</h2>
            <p>Ask anything, or drop in an image and ask about it.</p>
            <div className="chips">{IDEAS.map((t) => <button key={t} className="chip" onClick={() => send(t)}>{t}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={'m ' + m.role}>
            {m.role === 'assistant' && <img className="av" src="/logo-mark.png" alt="" />}
            <div className="bub">
              {m.images?.map((s, j) => <img key={j} src={s} className="mimg" alt="Uploaded" />)}
              {m.role === 'assistant' && m.tools && m.tools.length > 0 && <ToolRuns tools={m.tools} />}
              {m.role === 'assistant' ? (m.content ? <Markdown text={m.content} /> : <span className="typing" role="status" aria-label="Thinking"><i /><i /><i /></span>) : m.content}
              {m.id && <Rate id={m.id} />}
            </div>
          </div>
        ))}
      </div>
      {follow.away && <button className={'godown' + (busy ? ' live' : '')} onClick={() => follow.down()} aria-label="Scroll to latest message"><ArrowDown width="18" height="18" /></button>}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <Thumbs a={a} />
      <div className="compose">
        <AttachButton a={a} />
        <textarea ref={box} value={input} placeholder="Message SYNTH, or paste an image" rows={1} aria-label="Message"
          onChange={(e) => setInput(e.target.value)} onPaste={a.onPaste}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        {busy
          ? <button className="iconbtn" onClick={() => ctl.current?.abort()} aria-label="Stop"><Stop /></button>
          : <button className="iconbtn primary" onClick={() => send()} aria-label="Send"><Up /></button>}
      </div>
      <p className="tools"><span>Requests and ratings are logged to help SYNTH improve. Please don't enter personal data.</span>{msgs.length > 0 && <button className="linkbtn" onClick={() => { setMsgs([]); setErr(''); }}>Clear chat</button>}</p>
    </section>
  );
}
