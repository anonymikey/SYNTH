# SYNTHAI

Free AI assistant (Synth Assistant) and web app builder. Next.js 14, no database, no extra dependencies.
Written from scratch (not derived from Freebuff's code), so it is yours to license as you like.

## Run locally
```
npm install
cp .env.example .env.local   # add your key
npm run dev
```

## Get a free key (pick one)
| Provider | AI_BASE_URL | Notes |
|---|---|---|
| OpenRouter (default) | `https://openrouter.ai/api/v1` | Free account, no card. Models ending in `:free`. The picker lists them automatically and the server refuses non-free ones. |
| Groq | `https://api.groq.com/openai/v1` | Free tier, very fast. |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | Free Gemini tier. Set DEFAULT_MODEL yourself. |

Free model lineups change often, so the picker reads the provider's live list. Set `DEFAULT_MODEL` to the one that works best for you. If the chosen model is rate-limited, the next two are tried automatically.

## Deploy
1. Push to GitHub.
2. Import the repo at vercel.com/new.
3. Add `AI_API_KEY` (and optionally `AI_BASE_URL`, `DEFAULT_MODEL`) under Environment Variables.
4. Deploy.

Your key is used server-side only. Anyone with the URL can use your free quota, so add a login or rate limit before sharing widely.

## Ideas for next
Markdown and code highlighting in chat, saved chats (Vercel KV or Supabase), login, rate limiting, multi-file projects with a file tree, one-click publish of builds, image input, a model-comparison view.

## Learning and admin panel

SYNTHAI's model weights do not change. What learns is its **memory**: a store of short lessons that is added to every prompt.

**How it learns**
1. Every chat and build is logged (emails and long numbers are stripped), and users can rate replies Helpful / Not helpful. Errors count as negative.
2. Once a day (Vercel Cron, 03:00 UTC) and whenever you press *Run learning now*, a free model reads recent activity and writes (a) lessons and (b) weak areas with severity.
3. **Only lessons you approve in /admin are injected into prompts.** Set `AUTO_APPROVE=true` to let its own lessons go live automatically. Lessons from other agents always wait for review.

**Learning from other agents**
- Push: `POST /api/agents/ingest` with header `x-agent-key` and body `{"lessons":[{"topic":"...","text":"..."}]}`. Keys come from `AGENT_KEYS`.
- Pull: list JSON feed URLs shaped like `{"lessons":[...]}` in `AGENT_FEEDS`; the daily job fetches them.

**Admin panel** at `/admin` (password = `ADMIN_PASSWORD`): activity and rating stats, focus areas ranked by severity, lessons by source with approve/reject/delete, manual lessons, recent activity, run learning now.

**Setup**: in Vercel, Storage > Marketplace > Upstash Redis (free tier) and connect it to the project, then set `ADMIN_PASSWORD` and `CRON_SECRET`. Without Redis the app still works but data resets between requests.

Because logs contain what people type, tell your users (the footer notice does) and check the privacy rules where you operate.

## Images
Add images in Synth Assistant or the Web builder with the **Add image** button, by pasting (Ctrl/Cmd+V) or by dropping files. Up to 4 per message. They are resized in the browser (longest side 1568 px) and sent as inline data, so they never need storage. Only image-capable models are used when an image is attached: OpenRouter reports this per model, and those models show "(images)" in the picker. Images are passed to the model provider but SYNTHAI does not store them; only a text marker such as "[1 image]" appears in the logs. In the Web builder, a screenshot or sketch is recreated as a working page.

## Logo and icons
`public/logo.png` (full logo) and `public/logo-mark.png` (emblem) are used in the app. `app/icon.png`, `app/apple-icon.png` and `app/favicon.ico` are picked up by Next.js automatically for browser tabs and home screens. To change the logo, replace these files.
