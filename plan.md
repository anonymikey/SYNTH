# SYNTHCODE multi-language project export — implementation plan

## Approved scope and architecture

The user selected **source generation/export only** for Python, Rust, Go, C++, and Node.js backend starter projects. SYNTHCODE must not compile, test, execute, host, or deploy those source-only projects. Keep the existing Web browser preview and TypeScript browser transpile/preview. TypeScript remains transpile-only; it does not provide full type-checking or package installation. Do not add an execution service, container runner, new cloud provider, server-side `exec`, or a paid external dependency.

The project remains a Next.js application on Vercel. The existing streaming build pipeline, client-side project-file parser, Code explorer/editor, and ZIP exporter remain the source-generation path. No new API route is needed. The iframe stays reserved for Web and TypeScript browser previews.

`components/Builder.js` owns Auto and language-aware generation, validation/retry, source-only completion state, Code-view default, and download behavior. `components/BuilderLanguageSettings.js` owns the Builder-only language-preference side panel. `lib/project-languages.js` owns source-mode labels, instructions, response-mode resolution, entry selection, and essential-file validation. `lib/files.js` recognizes new language fences and file badges. `components/CapabilityBanner.js` announces the release across the landing page, workspace, and Dev Updates. `components/landing/Landing.js`, `app/page.js`, and `app/dev-updates/data.js` describe the shipped capability and boundary. Tests cover mode selection, persistence, file formats, project validity, and public copy.

## Project structure

- `app/` holds the existing Next.js App Router pages and API routes. The root landing metadata and Dev Updates data change; no code-execution API route is added.
- `components/` contains the established Assistant, SYNTHCODE Builder, file explorer, landing page and shared capability banner. Builder remains the single user-facing generation workflow.
- `lib/` holds the current project parser/export utilities and browser TypeScript compiler. The new `project-languages.js` is a pure registry/validation helper, not a runtime service.
- `test/` uses the existing Node test runner for file parsing, project scaffolding validation, ZIP contents, TypeScript regression and public copy.
- `public/` retains existing responsive banner artwork and the build-generated TypeScript compiler asset; no new images or provider services are needed.
- `scripts/` retains the existing compiler-asset preparation hook. `next.config.js`, `package.json`, and the Vercel deployment model remain otherwise unchanged.

After implementation, publish one combined Dev Update covering the already-added TypeScript mode and the new source-export modes. Update the existing SYNTHCODE and landing-page CapabilityBanner variants. Release copy must distinguish browser previews from exported source packages, and the new announcement must still appear to browsers that dismissed the prior banner.

## Design system and interaction

**Design movement:** Continue SYNTH's dark, atmospheric, glass-layered creative-workspace aesthetic rather than introducing a new style.

**Core principles:** Keep technical limits visible; keep generation and export in the existing project workflow; preserve compact, responsive controls; make every action functional and accessible.

**Color philosophy:** Reuse the deep navy background and translucent panels, with cyan, blue, and violet accents for focus, progress, and capability emphasis. The existing palette includes `#05070f`, `#22d3ee`, `#4f8cff`, and `#8b5cf6`.

**Layout paradigm:** Preserve SYNTHCODE's split work surface: project/history and prompt controls on one side, the Code/Preview stage on the other. Default new projects to Auto; put explicit language preferences in a Builder-only side drawer and keep an active project's selected mode stable. Source-only projects open directly in Code, while Preview explains the limitation and offers working navigation/download actions. On smaller screens, prioritize one-pane navigation, wrap toolbars and preserve touch-sized controls without horizontal overflow.

**Signature elements:** Retain the subtle dotted-grid background, cyan-to-blue-to-violet gradients, and compact rounded chips/status indicators.

**Interaction and animation:** Reuse the existing live file stream, retry behavior, responsive tabs, project download, banner dismissal, and reduced-motion handling. Do not add simulated compilation or decorative run buttons.

**Typography:** Use the site's existing configurable heading/body font variables; keep code and file paths in the existing system-monospace treatment. Preserve Personalization's current font choices and user settings.

**Brand essence:** SYNTH is a flexible AI workspace for people who want to think, build, and improve in one place; distinctive for its transparent, file-based workflow. Personality: precise, inventive, candid.

**Brand voice:** Direct and practical; say what runs and what is only exported. Examples: “Generate a source project to run in your own environment.” “Preview supported browser projects before you download them.”

**Wordmark and logo:** Reuse the existing SYNTH wordmark and mark; do not create a competing logo.

**Signature brand color:** SYNTH cyan `#22d3ee`, balanced by the existing blue/violet accent gradient.

## Auto language selection and SYNTHCODE settings

New projects use **Auto** by default. The existing generation request asks the coding agent to choose one best-fit supported mode (Web, TypeScript, Python, Rust, Go, C++, or Node.js backend); it does not make a separate routing/model call. The response identifies its chosen mode for file validation, with a conservative file-shape fallback. Hide that protocol marker from displayed assistant copy. Keep the selected effective mode fixed for follow-up edits in the same project and preserve the existing failover and single format-retry path.

Add a language-preference side drawer reachable from SYNTHCODE only. Save `auto` or a specific supported language in `localStorage`; Auto remains the default. A changed preference applies to the next new project only, not the currently open project's files or preview. Reset/New starts a clean project using the saved preference. Keep the site-wide Personalization dialog limited to its existing appearance controls.

For responsiveness, retain the two-pane desktop project/history plus stage layout, switch to the existing tabbed one-pane pattern on narrow screens, and ensure the Assistant conversation and composer, Builder toolbars, project header, file explorer, and preference drawer fit common phone/tablet widths with wrapping or internal scrolling rather than horizontal page overflow. Preserve usable touch targets and keyboard-accessible controls.

## SYNTHCODE template gallery

Reuse the empty-state branch in `components/Builder.js` and its existing `pick()` callback so templates populate the real project prompt, focus the current textarea, and do not bypass language preference, attachment, or build behavior. Keep template metadata and detailed starter prompts in a small local registry module; filter that data by the exact Featured, All, Landing pages, Stores, Portfolio, Games, SaaS, and Starters categories, and paginate six cards at a time through accessible previous/next controls. The reference's initial Featured page uses six recognizable dark thumbnail previews; construct those previews with local CSS/UI fragments rather than remote images or extra dependencies. Place the section directly below the welcome composer, preserve existing home content, and make category tabs, six-card desktop layout, horizontal page navigation, and prompt selection adapt to touch-size controls and internal scrolling on smaller screens. Keep SYNTH's dark-glass colors, cyan/blue/violet accent palette, headings, and reduced-motion behavior.

## SYNTH Assistant welcome presentation

Reuse `components/Chat.js` and the existing Assistant shell; do not add routes, providers, dependencies, or parallel chat state. For an empty conversation, arrange the existing SYNTH logo, concise branded heading and guidance, the same working message composer, then the existing actionable starter prompts in a calm, centered vertical hierarchy. When messages exist, keep the composer docked at the bottom of the Assistant workspace and preserve the current message log, response actions, tool runs, clear-chat behavior and error handling.

Keep SYNTH's dark atmospheric background, glass panels, cyan/blue/violet accents, logo, and overlay sidebar behavior. Refine spacing and microcopy without reproducing another product's complete visual identity or adding nonfunctional controls. Preserve attachments, paste/drop images, voice input, image generation, disclosure copy and seed-prompt handoff. At desktop, tablet and phone widths, let the empty view breathe while keeping its composer and prompt suggestions usable; permit internal vertical scrolling on short screens and prevent horizontal page overflow.

## Assistant Markdown and website sources

Make `components/Markdown.js` parse headings and list markers per line/block so valid Markdown such as `###` headings and `*`/`-` lists render as styled elements instead of literal punctuation. Preserve code fences, inline code, emphasis, links and safe plain-text rendering.

Carry bounded, structured metadata from the existing public web-search and page-reader tools through their current tool events to the answer that used them. Show one per-response **Sources** disclosure with deduplicated source cards containing the page title, host, short excerpt and an explicit external link. Keep this response-scoped in client state; do not persist source results or add provider-specific APIs. Replace raw multi-line search text in expanded website tool rows with the same safe source-preview presentation when metadata is available. Reject unsafe/non-HTTP(S) links, escape untrusted titles/snippets, and do not load third-party favicons.

UX reference research: [OpenAI ChatGPT Search help](https://help.openai.com/en/articles/9237897-searching-the-web-with-chatgpt) describes clickable citations, desktop previews and a Sources panel below an answer; [OpenAI's search introduction](https://openai.com/index/introducing-chatgpt-search/) describes opening the Sources control to a sidebar; [Google Gemini source help](https://support.google.com/gemini/answer/14143489?hl=en) describes citations inline or a Sources control that opens a right-side panel. Adopt the discoverable per-answer source control, compact previews and explicit original links, while retaining SYNTH's own dark glass visual system.

## Public-only Agent-Reach sources for Assistant and SYNTHCODE

Use the upstream Agent-Reach v1.6.1 wheel, pinned by its published SHA-256 in `uv.lock`, with FastAPI 0.162.2 and Python 3.12 in a separate service under `services/agent_reach/`. Configure Vercel Services with the existing Next.js app as the public frontend and the Python service as a private backend. Add a caller-side service binding named `AGENT_REACH_URL`; route public requests to the existing frontend only, leave the Python service without a public rewrite, and preserve the `/api/cron/learn` schedule. The private worker is reachable only through that binding; do not add a public proxy endpoint.

Allow only public read actions: GitHub search/read and YouTube search/read/subtitles. Exclude Agent-Reach's own web channel because SYNTH already has web search/read; exclude YouTube Whisper transcription, every login-gated/experimental channel, arbitrary CLI actions and arbitrary URLs. Do not supply user cookies or provider keys. Use an empty temporary home in the Python service and remove GitHub token variables so GitHub requests stay unauthenticated. Return a bounded, normalized result envelope with generic errors and no raw provider diagnostics.

Register the new actions in `lib/tools.js`, the existing shared Assistant/SYNTHCODE tool registry. Preserve existing web tools as the normal web-search/page-reader path. Use the existing response-scoped Sources disclosure and tool activity UI for safe GitHub/YouTube links and excerpts. Bound each Agent-Reach action to 9 seconds and the Node binding request to 11 seconds, within the existing 15-second tool/52-second answer/60-second route budgets; cap returned text and degrade gracefully on GitHub rate limits or YouTube challenges. GitHub public search was responsive in the sandbox; a public YouTube read was challenged, so YouTube remains best-effort without login/cookie fallback. Vercel Services are currently Beta; service/function use consumes Vercel runtime quota even though no paid third-party API key is needed.

The project structure adds `services/agent_reach/app.py`, `.python-version`, and a Python `pyproject.toml`/`uv.lock` that pin Agent-Reach's release wheel and transitive dependencies; the Node caller remains in `lib/tools.js`, and source metadata continues through `lib/agent.js`, `components/Chat.js`, `components/Builder.js` and `components/ToolRuns.js`. Keep all existing Next routes, cron behavior and workspace UI intact. A Vercel Preview deployment is still required to confirm the project-specific service build and binding before production release; a local Next.js build alone does not prove that deployment.

Implementation references: [Agent-Reach v1.6.1](https://github.com/Panniantong/Agent-Reach/tree/v1.6.1), [Vercel Services](https://vercel.com/docs/services), [Service bindings](https://vercel.com/docs/services/bindings), [FastAPI on Vercel](https://vercel.com/docs/frameworks/backend/fastapi), and [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python).

## SYNTHCORE training reliability

Keep the existing configured-provider fallback and persisted failed-run report. Honor `Retry-After` in both seconds and HTTP-date form, with a bounded maximum cooldown. Persist model/provider cooldown deadlines in the existing shared storage with TTL so fresh serverless instances respect them; store only timestamps, not credentials or raw errors. Bound these cooldown reads/writes to 750 ms and treat storage failure as best-effort so cooldown bookkeeping cannot starve provider failover. Do not retry OpenRouter models already in cooldown when no healthy candidates remain; skip that provider for the current run and preserve time for the next configured service. Require both `lessons` and `weak_areas` arrays in model JSON and reject malformed entries before applying model analysis or adding self-generated lessons. Independently configured `AGENT_FEEDS` are imported as pending-review lessons and do not depend on model-analysis success. When every service fails, retain the interaction evidence and show the failed run/attempts so it can be retried later. Return a non-2xx response from `/api/cron/learn` when analysis fails so cron monitoring detects the failure, while keeping the persisted Learning Studio report authoritative. The cron pill checks `CRON_SECRET` configuration only, so label it as authorization readiness rather than implying a successful scheduled training run.

## Optional UnoRouter text fallback

Add the user-approved UnoRouter API only as a disabled-by-default server-side fallback in the existing Assistant/SYNTHCODE streaming router. Use the fixed `https://api.unorouter.com/v1` endpoint and a server-only API key. Restrict model configuration to IDs ending exactly in `:free`, default to free text models, and never select paid models; skip image requests until the chosen free model's vision behavior is deliberately verified. Keep the provider last by default, preserve explicit order overrides, and do not use it for Cloudflare image generation, transcription, or Learning Studio training analysis.

Parse `Retry-After` as either delay-seconds or HTTP-date, cap cooldowns, persist only model cooldown timestamps in the existing shared Redis/Upstash store with a bounded 750ms timeout, and require connected shared storage for UnoRouter readiness. If storage is absent or an atomic reservation fails, skip UnoRouter and continue immediately to other targets. Expose health only through the protected Learning Studio using SYNTH-safe provider labels; never expose API credentials or raw model identifiers. Disclose that requests may pass through UnoRouter to upstream model operators with differing data-use policies. Add unit and routing coverage for the free-only boundary, disabled/misconfigured behavior, Retry-After, persistence, and fallback, then run all existing tests and the production build.

## Settings tabs and task notifications

Keep the current sidebar Settings entry and existing appearance controls, but present the dialog as two accessible tabs named exactly **Personalization** and **Notification**. Preserve the existing personalization storage and behavior. Add a separate validated, versioned local notification preference record for browser-notification permission state, task categories, hidden-tab favicon indicator, sound enablement, and per-workspace sound overrides.

Mount one `NotificationManager` in `app/app/page.js`, shared by SYNTH ASSISTANT and SYNTHCODE. Emit task-start/success/failure/stopped events from Assistant text/image generation and from SYNTHCODE only after a project passes its existing validation. While the workspace tab is hidden, use the browser Notification API only when the user has opted in, permission is granted, and that task category is enabled. Use generic, privacy-safe copy; never include prompts, response text, file contents or model/provider names. Optionally notify on task failure. Show a SYNTH favicon dot for active/unread work and clear it when the user returns to the tab. Do not prompt for permission automatically.

Notifications are page-lifecycle notifications, not Web Push: the SYNTH tab must remain loaded in the browser for an in-progress task to finish and notify; this must be stated in the UI. Unsupported or denied browser permissions must leave normal task behavior unaffected. Sound presets are short Web Audio tones, with task-specific user overrides and preview. Let the authenticated Learning Studio admin set safe workspace defaults for Assistant and SYNTHCODE through a dedicated admin-protected endpoint and existing metadata storage; expose only the allowlisted sound IDs through a read-only defaults endpoint. Settings overrides stay local to the user's browser. No audio assets, provider keys, third-party packages, push subscriptions or notification server are needed.

Add a small reusable `NotificationSetupBanner` immediately above each workspace composer. It appears automatically while that workspace's notification permission/category is not configured, and its **Enable** button requests browser permission only from the user's click or enables the category if permission is already granted. For denied permission, show browser site-settings guidance instead of retrying the prompt. Its close button snoozes only for the current tab session; if setup remains incomplete, show it again in a later session. Do not show it in unsupported browser contexts, obstruct the composer, or change task behavior.

Place preference normalization and sound presets in `lib/notifications.js`; the shared listener and favicon/native notification logic in `components/NotificationManager.js`; notification controls in `components/NotificationSettings.js`; tab composition in `components/Personalization.js`; task signals in `components/Chat.js` and `components/Builder.js`; and safe sound-default endpoints/UI in `app/api/notifications/defaults/route.js`, `app/api/admin/notification-sounds/route.js`, and `components/Admin.js`. Keep settings mobile-responsive, keyboard-accessible and consistent with the existing dark-glass system.

## Personalization themes and local workspace backgrounds

Extend the existing Personalization preference record and root `data-theme` application rather than creating a second settings system. Retain saved dark/light/system choices and add distinct SYNTH palettes (Aurora, Obsidian, Ember and Forest); each choice recolors the shared Assistant/SYNTHCODE workspace while preserving the independently selected accent, typography, conversation style and density. System follows the live OS color-scheme preference. Theme selection shows a short, choice-specific animated `role=status` message (including “Switching off the lights” for Dark), with entry/exit motion suppressed under reduced-motion settings.

Add an optional user-selected raster wallpaper for the workspace. Process it in the browser into a bounded, compressed data URL before saving it in the existing local preference record; do not upload the image or send it to an API. Provide a preview, adjustable dark overlay and remove action. Validate persisted image data and overlay values, keep text contrast adjustable, and preserve existing settings/tab behavior on desktop and mobile.

## Safety and accuracy

Never execute generated source or dependencies in the Next.js application, Vercel functions, or the browser preview. Do not describe source generation as compilation, testing, execution, hosting, or deployment. Python/Rust/Go/C++/Node.js backend exports include appropriate source/build/dependency files and local run instructions, but SYNTHCODE does not verify those instructions. TypeScript only transpiles a single `.ts` file for the existing browser preview; it does not type-check or resolve packages.

The research supporting these constraints is retained in `/home/ubuntu/multi-language-research/` and includes official Pyodide, Rust, Go, Emscripten, Next.js, Node.js, MDN, and Vercel documentation.
