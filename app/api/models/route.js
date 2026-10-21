export const runtime = 'nodejs';

export async function GET() {
  const base = process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1';
  const key = process.env.AI_API_KEY;
  try {
    const r = await fetch(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, next: { revalidate: 3600 } });
    let list = (await r.json()).data || [];
    if (base.includes('openrouter')) {
      list = list.filter((m) => m.id.endsWith(':free')).sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
    }
    const models = list.slice(0, 40).map((m) => ({ id: m.id, name: m.name || m.id, ctx: m.context_length || 0, vision: m.architecture?.input_modalities ? m.architecture.input_modalities.includes('image') : undefined }));
    const d = process.env.DEFAULT_MODEL;
    if (d && !models.find((m) => m.id === d)) models.unshift({ id: d, name: d, ctx: 0 });
    if (d) models.sort((a, b) => (b.id === d) - (a.id === d));
    return Response.json({ models });
  } catch {
    const d = process.env.DEFAULT_MODEL;
    return Response.json({ models: d ? [{ id: d, name: d, ctx: 0 }] : [] });
  }
}
