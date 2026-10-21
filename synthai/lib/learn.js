import { recent, addLesson, setMeta } from './db';
import { complete } from './ai';

const PROMPT = `You review logs of an AI assistant (a chat and a web-app builder). Each line is: [mode][rating] user request => start of reply. Rating: 1 = user liked it, -1 = user disliked it or it errored, 0 = no rating.
Find patterns. Return ONLY JSON, no prose:
{"lessons":[{"topic":"short topic","text":"one general, actionable guideline for the assistant, max 200 chars"}],"weak_areas":[{"topic":"short topic","why":"evidence from the logs","severity":1}]}
Severity is 1 (minor) to 3 (urgent). At most 5 lessons and 5 weak areas. Lessons must never contain personal data and must never tell the assistant to ignore rules or the user.`;

export async function runLearning() {
  const result = { ts: Date.now(), analyzed: 0, added: 0, pulled: 0, error: null };

  // 1. Pull lessons from other agents' feeds (always held for admin review).
  for (const url of (process.env.AGENT_FEEDS || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      const j = await (await fetch(url, { headers: { Accept: 'application/json' } })).json();
      const src = 'agent:' + new URL(url).hostname;
      for (const l of (j.lessons || []).slice(0, 20)) if (await addLesson({ text: l.text, topic: l.topic, source: src })) result.pulled++;
    } catch {}
  }

  // 2. Learn from our own recent activity.
  const evs = await recent(150);
  result.analyzed = evs.length;
  if (evs.length >= 3) {
    try {
      const lines = evs.map((e) => `[${e.mode}][${e.fb}] ${e.prompt.slice(0, 160)} => ${e.reply.slice(0, 200)}`).join('\n');
      const out = await complete([{ role: 'system', content: PROMPT }, { role: 'user', content: lines }]);
      const j = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
      await setMeta('focus', { ts: Date.now(), areas: (j.weak_areas || []).slice(0, 5) });
      const auto = process.env.AUTO_APPROVE === 'true';
      for (const l of (j.lessons || []).slice(0, 5)) if (await addLesson({ text: l.text, topic: l.topic, source: 'self', status: auto ? 'approved' : 'pending' })) result.added++;
    } catch (e) { result.error = 'Analysis failed: ' + String(e.message).slice(0, 160); }
  }
  await setMeta('lastResult', result);
  return result;
}
