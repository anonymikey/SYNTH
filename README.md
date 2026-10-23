# SYNTH

Free AI assistant (SYNTH ASSISTANT) and web app builder (SYNTHCODE). Next.js 14, no database, no extra dependencies.
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

SYNTH's model weights do not change. What learns is its **memory**: a store of short lessons that is added to every prompt.

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
Add images in SYNTH ASSISTANT or SYNTHCODE with the **Add image** button, by pasting (Ctrl/Cmd+V) or by dropping files. Up to 4 per message. They are resized in the browser (longest side 1568 px) and sent as inline data, so they never need storage. Only image-capable models are used when an image is attached: OpenRouter reports this per model, and those models show "(images)" in the picker. Images are passed to the model provider but SYNTH does not store them; only a text marker such as "[1 image]" appears in the logs. In SYNTHCODE, a screenshot or sketch is recreated as a working page.

## Logo and icons
`public/logo.png` (full logo) and `public/logo-mark.png` (emblem) are used in the app. `app/icon.png`, `app/apple-icon.png` and `app/favicon.ico` are picked up by Next.js automatically for browser tabs and home screens. To change the logo, replace these files.

## Automatic model switching
The model is chosen on the server; visitors never see or pick it. With an image attached, only vision-capable models are used; otherwise the top-ranked free models. If a model errors (rate limit, rejected key, empty or broken stream, or no first token within 14 s), SYNTH silently moves to the next one, up to 3 retries, before showing a friendly message. Failures are recorded in the admin panel under "Model switching log". `/api/models` is admin-only.

## SYNTHSPARK (routing engine) and SYNTHCORE (training stats)
**Engines.** Without extra setup, SYNTH routes to OpenRouter free models. Optionally add a FreeLLMAPI gateway (github.com/tashfeenahmed/freellmapi) as the first engine; OpenRouter then becomes the automatic fallback.
1. Run FreeLLMAPI on a server you control (Docker: `curl -fsSL https://freellmapi.co/install.sh | bash`, serves on port 3001). It cannot run on Vercel because it is a long-running server with a local database.
2. In its dashboard, Keys page: add free keys for Google, Mistral, Cerebras, NVIDIA, OpenRouter, Cloudflare and any others; copy the unified key (`freellmapi-...`).
3. Put it behind HTTPS, then set `SPARK_BASE_URL` and `SPARK_API_KEY` in Vercel and redeploy.
4. Optional: create gateway profiles (for example one holding vision-capable models and one holding code/reasoning models) and set `SPARK_VISION_MODEL` / `SPARK_CODE_MODEL` to `auto:<profile>`.

**Routing.** SYNTH ASSISTANT uses `auto` (images are restricted to vision-capable models by the gateway); SYNTHCODE uses `auto:smart` with a code hint. Each request tries up to 2 gateway routes, then OpenRouter free models, up to 4 attempts in total. A target that errors, rejects the key, breaks the stream or shows no token within 14 s is skipped silently. The OpenRouter fallback prefers vision-capable models for the assistant and code/reasoning models for SYNTHCODE.

**Diagnostics.** /admin shows "SYNTHSPARK Engine Diagnostics": time, task, target node (the real provider/model), failover count, latency to first token, and status (Success, Fallback or Failed).

**SYNTHCORE.** Every served request is attributed to the node that answered, by task type (general, writing, coding help, summarising, translation, analysis, image reading, new build, edit build). Ratings, failures, latency and lessons authored are added. /admin shows each model's training share, success, helpful rate, latency and what it can do, plus an overall readiness percentage. This is accumulated evidence, not retraining of the models.

Note: FreeLLMAPI describes itself as a personal-experimentation tool. Free tiers have their own terms, rate limits and no SLA, so review each provider's terms before serving the public through it.

## Troubleshooting
- **"Missing Authentication header" or 401:** the API key is empty, mistyped or rejected. SYNTH now trims spaces and quotes, but check that the variable is named exactly `AI_API_KEY`, is enabled for **Production**, and that you **redeployed** after adding it. `/admin` shows an "AI key" status.
- **Storage "Missing" in /admin:** connect Upstash Redis (Vercel, Storage tab) and redeploy.
- Models are ranked automatically (safety classifiers and embedding models are excluded). Set `DEFAULT_MODEL` to pin your favourite.

## Landing page and routes
`/` is the landing page (`components/landing/`, styles in `app/landing.css`). `/app` is the workspace and `/admin` the dashboard. The landing prompt box sends the visitor to `/app` and starts the build or answer automatically.
Swap points for React Bits are in `components/landing/bits.js` (Shiny Text, Count Up, Logo Loop, Spotlight Card, Tech Text wordmark). Paste a React Bits component over the matching export and keep its name and props.

## SYNTHCODE welcome screen
Until a build starts, SYNTHCODE shows a full-page welcome: heading, subtitle, four example prompts (they fill the box so you can edit them), an animated how-it-works flow and a prompt dock at the bottom (Enter builds, Shift+Enter adds a line, paste or drop images). If the very first build fails or is stopped, you return to this screen with your prompt restored.
