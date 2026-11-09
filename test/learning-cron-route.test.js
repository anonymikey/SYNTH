import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/cron/learn/route.js', import.meta.url), 'utf8');

test('scheduled learning stays authenticated and reports failed analysis to cron monitoring', () => {
  const authCheck = route.indexOf("if (!process.env.CRON_SECRET || req.headers.get('authorization')");
  const learningCall = route.indexOf('const result = await runLearning()');
  assert.ok(authCheck >= 0 && learningCall > authCheck, 'authorization must be checked before running learning');
  assert.match(route, /status:\s*result\?\.error\s*\?\s*503\s*:\s*200/);
});
