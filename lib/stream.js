// Streams one request. Model choice, failover and tool use happen on the server. Calls onText(fullTextSoFar) on every chunk.
// mode: 'chat' (SYNTH ASSISTANT) or 'build' (SYNTHCODE). meta.tid receives an opaque id that links ratings to the answer.
// onEvent receives tool activity: { type: 'tool', id, tool, label, state: 'running' | 'done' | 'error', ... }.
async function once({ messages, system, mode, retry }, onText, signal, meta, onEvent) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, system, mode, retry }),
    signal,
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  if (meta) meta.tid = res.headers.get('x-synth-tid') || null;
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '', full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const l of lines) {
      const s = l.trim();
      if (!s.startsWith('data:')) continue;
      const d = s.slice(5).trim();
      if (d === '[DONE]') continue;
      try {
        const j = JSON.parse(d);
        if (j.synth) {
          if (j.synth.type === 'meta' && j.synth.tid && meta) meta.tid = j.synth.tid; // the step that wrote the final answer
          else if (onEvent) onEvent(j.synth);
          continue;
        }
        const t = j.choices?.[0]?.delta?.content;
        if (t) { full += t; onText(full); }
      } catch {}
    }
  }
  if (!full) throw new Error('Empty response from model.');
  return full;
}

// One automatic retry on the next target if a reply finished empty (the server already handles hard failures).
export async function streamChat(opts, onText, signal, meta, onEvent) {
  try { return await once(opts, onText, signal, meta, onEvent); }
  catch (e) {
    if (e.name === 'AbortError' || !/Empty response/.test(e.message)) throw e;
    return once({ ...opts, retry: true }, onText, signal, meta, onEvent);
  }
}

// Folds one tool event into a list of tool calls (start adds a row, later events update it).
export function applyToolEvent(list, ev) {
  if (!ev || ev.type !== 'tool') return list;
  const i = list.findIndex((t) => t.id === ev.id);
  if (i < 0) return [...list, { ...ev }];
  const next = list.slice();
  next[i] = { ...next[i], ...ev };
  return next;
}
