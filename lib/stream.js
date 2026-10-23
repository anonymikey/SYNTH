// Streams one request. Model choice and failover happen on the server. Calls onText(fullTextSoFar) on every chunk.
// mode: 'chat' (SYNTH ASSISTANT) or 'build' (SYNTHCODE). meta.tid receives an opaque id that links ratings to this answer.
async function once({ messages, system, mode, retry }, onText, signal, meta) {
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
        const t = JSON.parse(d).choices?.[0]?.delta?.content;
        if (t) { full += t; onText(full); }
      } catch {}
    }
  }
  if (!full) throw new Error('Empty response from model.');
  return full;
}

// One automatic retry on the next target if a reply finished empty (the server already handles hard failures).
export async function streamChat(opts, onText, signal, meta) {
  try { return await once(opts, onText, signal, meta); }
  catch (e) {
    if (e.name === 'AbortError' || !/Empty response/.test(e.message)) throw e;
    return once({ ...opts, retry: true }, onText, signal, meta);
  }
}
