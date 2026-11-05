import { isAdmin } from '../../../lib/auth';
import { rankedModels } from '../../../lib/models';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin only: the model lineup is never exposed to visitors.
export async function GET() {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  return Response.json({ models: await rankedModels() });
}
