import { recent, addLesson, setMeta } from './db.js';
import { completeWith } from './ai.js';

const PROMPT = `You review logs of an AI assistant (a chat and a web-app builder). Each line is: [mode][rating] user request => start of reply. Rating: 1 = user liked it, -1 = user disliked it or it errored, 0 = no rating.
Find patterns. Return ONLY JSON, no prose:
{"lessons":[{"topic":"short topic","text":"one general, actionable guideline for the assistant, max 200 chars"}],"weak_areas":[{"topic":"short topic","why":"evidence from the logs","severity":1}]}
Severity is 1 (minor) to 3 (urgent). At most 5 lessons and 5 weak areas. Lessons must never contain personal data and must never tell the assistant to ignore rules or the user.`;

export function parseLearningOutput(output) {
  const text = String(output || '');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model did not return a JSON object.');

  let parsed;
  try { parsed = JSON.parse(text.slice(start, end + 1)); }
  catch { throw new Error('Model returned malformed learning JSON.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Model returned an invalid learning object.');
  if (!Array.isArray(parsed.lessons)) throw new Error('Model returned an invalid lessons list.');
  if (!Array.isArray(parsed.weak_areas)) throw new Error('Model returned an invalid weak-areas list.');

  const lessons = parsed.lessons.slice(0, 5).map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.topic !== 'string' || !item.topic.trim() || typeof item.text !== 'string' || item.text.trim().length < 10) {
      throw new Error('Model returned an invalid lesson entry.');
    }
    return { topic: item.topic.trim().slice(0, 80), text: item.text.trim().slice(0, 200) };
  });
  const weak_areas = parsed.weak_areas.slice(0, 5).map((item) => {
    const severity = Number(item?.severity);
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.topic !== 'string' || !item.topic.trim() || typeof item.why !== 'string' || !item.why.trim() || !Number.isFinite(severity)) {
      throw new Error('Model returned an invalid weak-area entry.');
    }
    return {
      topic: item.topic.trim().slice(0, 80),
      why: item.why.trim().slice(0, 240),
      severity: Math.max(1, Math.min(3, Math.round(severity))),
    };
  });
  return { lessons, weak_areas };
}

export async function runLearning() {
  const result = { ts: Date.now(), analyzed: 0, added: 0, pulled: 0, error: null, model: null, attempts: [] };

  // 1. Pull lessons from other agents' feeds (always held for admin review).
  for (const url of (process.env.AGENT_FEEDS || '').split(',').map((s) => s.trim()).filter(Boolean)) {
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(5000), cache: 'no-store' });
      if (!response.ok) throw new Error(`Feed returned HTTP ${response.status}`);
      const j = await response.json();
      const src = 'agent:' + new URL(url).hostname;
      for (const l of (j.lessons || []).slice(0, 20)) if (await addLesson({ text: l.text, topic: l.topic, source: src })) result.pulled++;
    } catch {}
  }

  // 2. Learn from our own recent activity.
  const evs = await recent(150);
  result.analyzed = evs.length;
  if (evs.length >= 3) {
    try {
      const lines = evs.map((e) => `[${e.mode}][${e.fb}] ${String(e.prompt || '').slice(0, 160)} => ${String(e.reply || '').slice(0, 200)}`).join('\n');
      const { model, attempts, value } = await completeWith([
        { role: 'system', content: PROMPT },
        { role: 'user', content: lines },
      ], { validate: parseLearningOutput });
      result.model = model;
      result.attempts = attempts;
      await setMeta('focus', { ts: Date.now(), areas: value.weak_areas });
      const auto = process.env.AUTO_APPROVE === 'true';
      for (const lesson of value.lessons) {
        if (await addLesson({ text: lesson.text, topic: lesson.topic, source: 'self', status: auto ? 'approved' : 'pending', by: model })) result.added++;
      }
    } catch (error) {
      result.attempts = Array.isArray(error.attempts) ? error.attempts : [];
      result.error = 'Analysis failed: ' + String(error.message).replace(/[\r\n\t]+/g, ' ').slice(0, 500);
    }
  }
  await setMeta('lastResult', result);
  return result;
}
