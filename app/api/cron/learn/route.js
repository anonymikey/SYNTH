import { runLearning } from '../../../../lib/learn';
export const maxDuration = 60;
export async function GET(req) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  const result = await runLearning();
  return Response.json(result, { status: result?.error ? 503 : 200 });
}
