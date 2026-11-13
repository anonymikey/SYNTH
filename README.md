# SYNTH

Free-tier AI assistant (SYNTH ASSISTANT) and responsive web app builder (SYNTHCODE), with provider failover, optional Cloudflare image/voice tools, admin learning evidence and browser-saved personalization. Next.js 15; no database required.
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

## Workspace appearance
Open **Settings** at the bottom of the sidebar, then choose **Personalization**. The workspace uses Sora headings and Inter body text by default; you can switch to system, serif or monospace fonts, select Midnight/Light/System theme, change the accent colors used by highlights and bars, adjust text size, and choose chat bubble style and message spacing. Preferences save automatically in the current browser. The Assistant and SYNTHCODE composers share the same compact toolbar layout; uploaded screenshots, voice input and image generation remain available where relevant. A capabilities announcement links the landing page, both workspaces and Dev Updates; clicking one of its actions or its close button dismisses it across all four areas using one shared local-storage flag in that browser.

## Assistant response actions
Completed Assistant answers and successful SYNTHCODE build outputs include copy, helpful/not-helpful feedback, browser read-aloud controls, sharing and response details. SYNTHCODE shows a concise reply summary with the full Markdown answer expandable above the same toolbar. Negative feedback can include one of five categories and an optional note. It updates the same interaction event used by Admin and SYNTHCORE; rating changes are applied to existing model-level counts rather than recorded as duplicate events. The Admin recent-activity table displays feedback details and links regenerated events to the response they replaced. Assistant replies regenerate using the preceding conversation context; the latest SYNTHCODE output regenerates through the existing file-aware build route using current project files and its original screenshot. Earlier build outputs retain copy/rating/speech/share/details but are not replayed without their historical project snapshot.

Share uses the browser's native share sheet when available. Otherwise, the user can explicitly create a 24-hour link that contains **only one selected response**, not its prompt or conversation history. The token is unguessable, the page is excluded from search indexing, and production links require persistent Upstash storage. If that storage is unavailable, the safe fallback is copying the response text. Anyone given a valid share link can view that response until it expires; review sensitive content before creating one. Generated image files are not embedded in response text links; use their Download image control to share the image itself.

## Ideas for next
Potential future work—not shipped: persistent saved chats/projects across sessions, login or team accounts, broader rate limits for chat, one-click publishing of SYNTHCODE projects, and an advanced model-comparison view. Markdown answers, code rendering and multi-file projects with a file explorer are already available.

## Learning and admin panel

SYNTH's model weights do not change. What learns is its **memory**: a store of short lessons that is added to every prompt.

**How it learns**
1. Every chat and build is logged (emails and long numbers are stripped), and users can rate replies Helpful / Not helpful. Errors count as negative.
2. Once a day (Vercel Cron, 03:00 UTC) and whenever you press *Run learning now*, an active model reads recent activity and writes (a) lessons and (b) weak areas with severity. The learning completion tries up to three eligible OpenRouter models, then enabled, configured learning-capable providers; the optional UnoRouter free-model fallback is deliberately excluded from Learning Studio analysis. Rate-limited models are cooled down, time is reserved for later providers, and malformed JSON is treated as a failed attempt so another model can try. The Learning Studio records the successful model and failed attempts.
3. **Only lessons you approve in /admin are injected into prompts.** Set `AUTO_APPROVE=true` to let its own lessons go live automatically. Lessons from other agents always wait for review.

At least one fallback provider must be enabled, have valid server credentials, and appear in `PROVIDER_ORDER` for it to be used; disabled providers are never called. If every configured provider or persistent storage is unavailable, a run can still fail, and the Admin panel reports the attempted targets. SYNTHCORE currently learns prompt memory and readiness evidence—it does not fine-tune model weights. Using SYNTHCORE as the first inference model later requires an actual trained model/endpoint and a separate inference-routing integration; the readiness percentage alone does not activate one.

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

## Providers: OpenRouter by default; SPARK, Cloudflare and UnoRouter optional
**OpenRouter is the default and the recommended stable setup.** Set `AI_API_KEY` and SYNTH works out of the box. SPARK, Cloudflare Workers AI and UnoRouter are optional providers, **disabled by default**. A missing or broken provider never blocks the others.

| Variable | Meaning |
|---|---|
| `ENABLE_SPARK=false` | Default. SPARK is ignored completely. |
| `SPARK_BASE_URL`, `SPARK_API_KEY` | Your gateway address (with or without `/v1`) and its unified key (`freellmapi-...`). |
| `SPARK_VISION_MODEL`, `SPARK_CODE_MODEL` | Optional gateway profiles (for example `auto:vision`, `auto:coding`) used as the first route. |
| `ENABLE_CLOUDFLARE=false` | Default. Cloudflare Workers AI is not called unless enabled. |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Cloudflare account ID and API token, used only on the server. Never expose the token in browser code. |
| `ENABLE_UNOROUTER=false` | Default. The optional free-model text fallback is skipped unless explicitly enabled. |
| `UNOROUTER_API_KEY` | Server-only UnoRouter key. Set an account spending limit and model allowlist there; SYNTH still independently rejects every configured model ID not ending in `:free`. |
| `UNOROUTER_FREE_MODELS` | Optional comma-separated free model IDs, e.g. `deepseek/deepseek-v4.1-flash-1017:free`. Defaults use two catalog IDs. |
| `PROVIDER_ORDER=openrouter,spark,cloudflare,unorouter` | Provider priority. For example `cloudflare,openrouter,spark,unorouter` puts Cloudflare first. Disabled or unavailable providers are skipped. |
| `GATEWAY_MODE` | Legacy SPARK shortcut: `disabled`, `fallback` or `primary`. It retains the optional providers in its configured order. |

**Turning SPARK on later**
1. Run FreeLLMAPI on a server you control (it is a long-running server, so not Vercel). Add free provider keys in its dashboard and copy the unified key.
2. In Vercel set `SPARK_BASE_URL`, `SPARK_API_KEY` and `ENABLE_SPARK=true`, then redeploy.
3. Leave `PROVIDER_ORDER=openrouter,spark,cloudflare,unorouter` to use optional services as later fallbacks, or move a provider to the start of the list.

### UnoRouter free-model fallback
UnoRouter is an optional OpenAI-compatible **text-only** fallback. To enable it, set `ENABLE_UNOROUTER=true`, add `UNOROUTER_API_KEY` as a server-only secret and include `unorouter` in `PROVIDER_ORDER`, then redeploy. SYNTH will only call model identifiers whose full ID ends exactly in `:free`; paid IDs are dropped before routing. Free catalog availability and upstream limits can change. SYNTH enforces a conservative shared one-request-per-model-per-minute reservation across its users, honors bounded `Retry-After` values, stores cooldown timestamps in connected Upstash Redis, and quickly moves to the next configured service on rate limit or failure. If shared storage is unavailable, it skips UnoRouter rather than risk duplicate calls. It is not used for image input, image generation, transcription or Learning Studio analysis.

When enabled, Assistant/SYNTHCODE prompts routed through this option pass through UnoRouter to whichever upstream free-model operator serves the request. Those operators may have different data retention or training practices, and some model routes may require additional consent. Do not enable this fallback for sensitive prompts unless you have reviewed the current UnoRouter and upstream terms/privacy policies. Its free model IDs do not use UnoRouter account balance, but free capacity is variable and does not provide reliable service availability.

### Cloudflare Workers AI, image generation and voice input
Enable Cloudflare by setting `ENABLE_CLOUDFLARE=true`, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_API_TOKEN` in the server environment. Create a least-privilege token for Workers AI; the token is used only on the server. Add `cloudflare` to `PROVIDER_ORDER` where you want it tried. SYNTH uses Cloudflare's OpenAI-compatible chat endpoint with the same streaming, task, tool, image-input, failover and attribution path as the other providers. Image messages are routed to a vision-capable model.

The chat composer also includes text-to-image generation and short voice transcription. These use Cloudflare Workers AI's FLUX.1 [schnell] and Whisper models, separately from chat failover. Image generation is capped at five requests per network per hour and transcription at ten; Upstash Redis makes these limits shared across app instances, while the no-Redis development fallback is best-effort. Their model outcomes are counted in SYNTHCORE and provider diagnostics. Cloudflare's Free plan includes 10,000 Neurons per day; further requests fail after the allocation is exhausted on the Free plan. Keep the Cloudflare account on Workers Free to avoid paid overage. If the account is upgraded to Workers Paid, usage above the daily free allocation can be billed. SYNTH does not select models Cloudflare marks as paid-only. The one-million-token context models currently require paid access, so SYNTH intentionally excludes them while configured for no payments. Model availability and limits can change; check Cloudflare's current [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) and [model catalog](https://developers.cloudflare.com/workers-ai/models/) before enabling or changing models.

**What happens when things go wrong**
- `ENABLE_SPARK=true` but a variable is missing: SPARK is skipped and OpenRouter serves everything. The admin panel shows SYNTHSPARK as Missing with a note.
- A provider errors, rejects its key, breaks the stream or shows no first token within 14 seconds: SYNTH silently moves to the next target. With two providers, each gets two tries before the other is used, up to four attempts in total. A provider that just failed is tried last for 90 seconds, so the next request does not wait on it.
- Everything fails: the user gets a clear "busy, try again" message (HTTP 503 with `Retry-After`). The app stays usable and the next request starts fresh.
- Model-level cool-downs (rate-limited or failing models go to the back of the list) still apply inside each provider.

**Routing by task.** SYNTH ASSISTANT asks the gateway for `auto` (images are restricted to vision-capable models by the gateway); SYNTHCODE asks for `auto:smart` with a code hint. On OpenRouter, the assistant prefers vision-capable models and SYNTHCODE prefers code/reasoning models, and safety classifiers are never used.

**Diagnostics.** /admin shows Provider health (OpenRouter: OK or Missing; SYNTHSPARK: Enabled, Disabled, Missing or Enabled but failing; a Disabled gateway is neutral, not an error) and "SYNTHSPARK Engine Diagnostics": time, task, target node, failover count, latency to first token and status (Success, Fallback or Failed).

**SYNTHCORE (training stats).** Every served request is attributed to the node that answered (for example `openrouter/<model>` or the gateway's real `<provider>/<model>`), by task type. Ratings, failures, latency and lessons authored are added, whichever provider answered. /admin shows each model's training share, success, helpful rate, latency and what it can do, plus an overall readiness percentage. This is accumulated evidence, not retraining of the models.

Note: FreeLLMAPI describes itself as a personal-experimentation tool, and free tiers have their own terms and rate limits. Review them before serving the public through it. OpenRouter stays available as the fallback.

## Troubleshooting
- **"Missing Authentication header" or 401:** the API key is empty, mistyped or rejected. SYNTH now trims spaces and quotes, but check that the variable is named exactly `AI_API_KEY`, is enabled for **Production**, and that you **redeployed** after adding it. `/admin` shows an "AI key" status.
- **Storage "Missing" in /admin:** connect Upstash Redis (Vercel, Storage tab) and redeploy.
- Models are ranked automatically (safety classifiers and embedding models are excluded). Set `DEFAULT_MODEL` to pin your favourite.

## Landing page and routes
`/` is the landing page (`components/landing/`, styles in `app/landing.css`). `/app` is the workspace and `/admin` the dashboard. The landing prompt box sends the visitor to `/app` and starts the build or answer automatically.
Swap points for React Bits are in `components/landing/bits.js` (Shiny Text, Count Up, Logo Loop, Spotlight Card, Tech Text wordmark). Paste a React Bits component over the matching export and keep its name and props.

## SYNTHCODE welcome screen
Until a build starts, SYNTHCODE shows a full-page welcome: heading, subtitle, four example prompts (they fill the box so you can edit them), an animated how-it-works flow and a prompt dock at the bottom (Enter builds, Shift+Enter adds a line, paste or drop images). If the very first build fails or is stopped, you return to this screen with your prompt restored.

## SYNTHCODE project files
The Code tab is a file explorer, not a single code view. The agent builds a small project (usually `index.html`, `styles.css`, `script.js`) and creates, edits or deletes files in it; you see each file appear live while it is written, then browse, search, edit, add and delete files yourself. The agent receives your edits on the next request, so you and the agent work on the same files.
- **Preview** bundles the project into one page (linked stylesheets and scripts are inlined) and runs it in a sandboxed frame. It has no server, so projects are plain HTML, CSS and JavaScript.
- **Download** gives a `.zip` of all files (a single file downloads as itself). **Share** sends the same file through the device share sheet where supported.
- The agent's reply format is one fenced block per file with its path, for example ```` ```html file=index.html ````. A plain single ```` ```html ```` block still works and becomes `index.html`. Files to remove go in a ```` ```delete ```` block. See `lib/files.js`.
- After each request, the files it created (+) or edited (~) are listed under "Last request"; click one to open it.

## Chat areas
When you scroll up in SYNTH ASSISTANT or in the SYNTHCODE prompt panel, SYNTH stops auto-scrolling so you can read, and a round down-arrow button appears to jump back to the newest message. Sending a message always jumps to the bottom.

## Agent tools (free)
SYNTH ASSISTANT and SYNTHCODE can use tools while they answer, and you see each one as it runs: a row under the message with the tool name, its input, a spinner, then a tick and the time taken (open the row for the input and a result preview). In SYNTHCODE the same rows appear on the "Last request" card, and the stage bar says "using <tool>" while one runs.

**Every tool is free and works without an account or key.**

| Tool | What it does | Service |
|---|---|---|
| `web#search` | Web search (titles, links, excerpts) | Tavily keyless mode |
| `web#read` | Reads a public page. Tries Jina Reader, then Tavily extract | Jina Reader, Tavily |
| `wikipedia#search`, `wikipedia#summary` | Find and summarise articles | Wikipedia API |
| `weather#forecast` | Current weather and forecast for a place | Open-Meteo |
| `hackernews#search` | Tech news and discussion | HN Algolia API |
| `cdnjs#search` | Exact CDN links and versions for libraries (SYNTHCODE) | cdnjs API |
| `currency#convert` | Currency conversion | ExchangeRate-API open endpoint |
| `clock#now` | Today's date and time in any timezone | built in |
| `calc#evaluate` | Exact arithmetic (a small parser, no `eval`) | built in |

**How it works.** The model is told which tools exist. To use one it replies with a `<tool_call>` block; SYNTH holds that text back from the user, runs the tool on the server, hands the result back, and the model continues. Up to 3 tools per answer. Every model step goes through the same provider and model failover as before, so a dead provider can never leave a tool round hanging. Tool results are passed as untrusted data, and any tool-call text inside a result is neutralised. A link pasted into a message is read automatically before the model answers (turn off with `TOOLS_AUTO_READ=false`).

**Admin.** /admin has an "Agent tools" section: which tools are on, calls, success rate, average time, last use and last problem per tool, a health state (Healthy, Degraded, Down, Off, or Not used yet), a "Check" button that runs one sample call (not counted as usage), per-tool on/off switches, and the 25 most recent calls. A tool is Down when most of its recent calls failed, or when a newer check failed. Tool usage is recorded whichever model or provider answered. Master switch: `ENABLE_TOOLS=false`.

**Optional free keys.** `TAVILY_API_KEY` (free tier) and `JINA_API_KEY` only raise rate limits. Keyless limits are modest, so if search or the reader starts returning "limit reached" under load, add a free key.

**Things to know**
- The public chat endpoint can trigger these tools, so a busy site can hit the free services' keyless limits. Add the free keys, or turn individual tools off in /admin.
- Pasted links and `web#read` pass the address to Jina or Tavily to fetch it. Search queries go to Tavily. Weather places go to Open-Meteo. Do not paste confidential links.
- Open-Meteo is free for non-commercial use; check its terms before running SYNTH commercially.
- Design credit: the tool ids (`provider#endpoint`) and the idea of described, health-tracked tools come from Monid's open connector standard (github.com/monid-ai/monid, MIT). Monid's own engine and catalog are not used: they need Deno and a vendor account per connector, billed through Monid, which conflicts with a free-only setup.
