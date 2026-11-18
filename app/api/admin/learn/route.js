import { isAdmin } from '../../../../lib/auth';
import { runLearning } from '../../../../lib/learn';
export const maxDuration = 60;
export async function POST() {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  const result = await runLearning();
  return Response.json(result, { status: result?.busy ? 409 : result?.error ? 503 : 200 });
}
