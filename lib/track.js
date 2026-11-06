const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

export async function track(payload) {
  try {
    const response = await post('/api/log', payload);
    return (await response.json()).id || null;
  } catch { return null; }
}

export async function rate(id, value, feedback = {}) {
  try {
    const response = await post('/api/feedback', { id, value, ...feedback });
    return await response.json();
  } catch { return { ok: false, error: 'Feedback could not be saved.' }; }
}
