// Streams one request. Calls onText(fullTextSoFar) on every chunk.
async function once({ messages, model, system }, onText, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, system }),
    signal,
  });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
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

// Free models get rate-limited often: if the chosen one fails, try the next ones.
export async function streamChat({ messages, models, system }, onText, signal) {
  let lastErr;
  for (const model of models.slice(0, 3)) {
    try { return await once({ messages, model, system }, onText, signal); }
    catch (e) { if (e.name === 'AbortError') throw e; lastErr = e; }
  }
  throw lastErr || new Error('No model available.');
}
