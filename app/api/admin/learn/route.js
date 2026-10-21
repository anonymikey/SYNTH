import { isAdmin } from '../../../../lib/auth';
import { runLearning } from '../../../../lib/learn';
export const maxDuration = 60;
export async function POST() {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  return Response.json(await runLearning());
}
