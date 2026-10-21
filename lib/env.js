export const apiBase = () => (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '');
// Tolerates quotes, spaces and a pasted "Bearer " prefix in the Vercel value.
export const apiKey = () => (process.env.AI_API_KEY || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();
export function keyProblem() {
  const k = apiKey();
  if (!k) return 'AI_API_KEY is not set on the server. Add it in Vercel for the Production environment, then redeploy.';
  if (k.length < 20) return 'AI_API_KEY looks too short to be a real key. Re-copy it from your provider and redeploy.';
  return '';
}
