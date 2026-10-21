const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
export async function track(p) { try { return (await (await post('/api/log', p)).json()).id || null; } catch { return null; } }
export async function rate(id, value) { try { await post('/api/feedback', { id, value }); } catch {} }
