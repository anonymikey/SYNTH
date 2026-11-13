# TODO

## SYNTHCODE source-project modes

- [x] Add selectable Python, Rust, Go, C++, and Node.js backend starter modes to SYNTHCODE. Generate their source files, conventional project/build/dependency metadata, and local run instructions; make the project files browsable/editable in the existing Code explorer and downloadable as a ZIP.
- [x] Keep Web browser preview and the existing TypeScript browser preview working. TypeScript transpiles `.ts` for the preview but does not provide full type-checking or package imports.
- [x] Clearly identify Python, Rust, Go, C++, and Node.js backend projects as source exports only: SYNTHCODE does not compile, test, run, host, or deploy those projects. Do not execute generated code in the SYNTH app server or iframe; include a preview notice and default these projects to the Code view.
- [x] Validate essential source/build files and require README.md to contain a language-appropriate local build/run/test command before accepting a result; preserve retry behavior for malformed output.

## One combined release update and banners

- [x] Add one Dev Update covering the TypeScript preview and the Python, Rust, Go, C++, and Node.js backend source-export modes together, with the not-compiled/tested/run/deployed limitation stated explicitly.
- [x] Update the SYNTHCODE workspace and landing-page capability banners to describe the same supported modes and limitations. Keep the copy responsive and branded, preserve the release-notes link on mobile, and increment the local dismissal key so users who dismissed the previous announcement can see this release once.
- [x] Update landing-page FAQ and metadata where needed so they distinguish browser previews from source-only exports and do not imply live backend execution.

## Auto language selection and SYNTHCODE-only preferences

- [x] Default new SYNTHCODE projects to Auto and let the existing generation agent choose the best supported output mode for the request: Web, TypeScript, Python, Rust, Go, C++, or Node.js backend. Keep language choice within the current generation/failover path—no separate routing-model call.
- [x] Add a language-preference settings side panel inside SYNTHCODE only. Let users keep Auto or select an explicit supported language; persist the preference locally. A changed preference applies to new projects only, while edits to an open project preserve its original effective language. New/Reset starts a clean project using the saved preference.
- [x] Resolve the agent's selected mode safely, validate generated files against that mode, hide the internal mode marker from user-visible output, and preserve one bounded formatting retry plus existing provider failover. Keep Web/TypeScript browser-preview behavior and source-only limits for Python/Rust/Go/C++/Node.js backend projects.

## Responsive workspaces

- [x] Organize SYNTH Assistant and SYNTHCODE at desktop, tablet, and phone widths. Keep content and controls within the viewport, allow long messages/files to wrap or scroll inside their pane, and prevent horizontal page overflow.
- [x] Keep Assistant conversation, response actions, image/voice controls and composer readable and touch-usable on small screens.
- [x] Keep Builder project/history, mode/settings access, composer controls, preview/code tabs, file explorer and download/share actions orderly on small screens. Make the settings drawer accessible from both Describe and Preview/Code panes, fit the viewport, and remain keyboard-accessible; preserve the desktop split-pane experience.

## SYNTH Assistant welcome layout

- [x] Reorganize the empty SYNTH AI Assistant state to align spacing and wording with the supplied reference: keep the SYNTH logo visible on the welcome surface and use a clear hierarchy of concise headline/copy, the working composer and actionable prompt suggestions.
- [x] Preserve SYNTH's dark atmospheric style, glass surfaces, colors and overlay sidebar behavior; do not copy another product's full visual identity or branding.
- [x] Keep existing content and functionality: attachment/paste/drop, voice input, image generation, seed prompts, conversation history, response toolbar, tool runs, clear chat, errors and the connected-service privacy note must continue to work. The composer returns to the workspace footer once a conversation starts.
- [x] Keep the welcome state and active conversation orderly on desktop, tablet and phone. Avoid horizontal page overflow; allow internal vertical scrolling when the prompt/composer/suggestions exceed a short viewport and keep controls touch-usable.

- [x] Configure the pinned Agent-Reach v1.6.1 Python service behind a private Vercel Services binding from the existing Next.js frontend. Keep public routes on Next.js, preserve the existing cron schedule and leave the Python worker without a public route.
- [x] Expose only unauthenticated public GitHub search/read and YouTube search/read/subtitle actions through SYNTH's existing shared tool registry, available to both Assistant and SYNTHCODE. Retain SYNTH's existing web search and page reader; do not enable Agent-Reach web, Whisper transcription, login-gated or experimental channels.
- [x] Keep the integration read-only and credential-free: accept only the approved channel/action/parameter allowlist, use an empty temporary service home, never use or return account cookies/tokens, bound source text/results, enforce strict timeouts, and return generic failures for rate limits/challenges/unavailable services.
- [x] Carry safe, bounded GitHub/YouTube title, host, excerpt and HTTP(S) link metadata through the existing tool events to the response Sources disclosure and compact tool activity preview, without persisting source content or displaying Agent-Reach/backend identifiers.
- [ ] Before production release, verify a Vercel Preview builds both services, injects `AGENT_REACH_URL`, and preserves the existing `/api/cron/learn` behavior.

- [x] Continue through configured learning providers/models on timeout, HTTP errors, malformed responses or failed output validation. If all attempts fail, save the failure and attempt details and retain the interaction evidence for a later run; do not add lessons from an invalid analysis.
- [x] Honor rate-limit `Retry-After` values in delay-seconds and HTTP-date form with a bounded cooldown, and skip OpenRouter models already cooling when no healthy candidates remain so the next configured service gets the remaining budget.
- [x] Label the Learning Studio status based on `CRON_SECRET` as cron authorization readiness, not successful scheduled training; keep the latest run's actual success/failure shown separately.
- [x] Persist provider/model cooldown timestamps in shared storage with expiry so a fresh serverless instance does not immediately retry a rate-limited target; never store provider credentials or raw error bodies.
- [x] Make `/api/cron/learn` return a non-2xx status when the analysis fails, while leaving the detailed result in Learning Studio; keep successful and no-op runs successful.
- [x] Bound shared cooldown-storage reads/writes and keep them best-effort so a stalled Redis request cannot delay provider failover.
- [x] Require complete `lessons` and `weak_areas` arrays and validate each retained model-generated entry before treating analysis as successful.

## Settings tabs and notification preferences

- [x] Keep the existing sidebar **Settings** button and dialog, organized into two accessible tabs named exactly **Personalization** and **Notification**. Preserve all current appearance choices and their existing local-storage behavior in Personalization.
- [x] In Notification, let each user opt in through an explicit browser-permission button and choose whether to notify for completed Assistant tasks, completed SYNTHCODE builds, and (optionally) failed tasks. Let users separately control the favicon dot and notification sounds; save preferences in this browser and provide graceful guidance for unsupported or denied browser notifications.
- [x] When an enabled task completes while the SYNTH workspace tab is hidden, show a generic browser notification only if permission has been granted. Do not expose prompts, responses, files, images or backend/model names in notification text. Clear the favicon dot when the user returns or acknowledges the notice; do not alter normal task behavior when notifications are unavailable.
- [x] Provide distinct, previewable sound choices per task. Allow the authenticated Learning Studio admin to set safe workspace default sounds for Assistant and SYNTHCODE; users may override defaults in their own Notification settings. Validate sound IDs and use generated Web Audio tones rather than loading arbitrary audio files.
- [x] Keep the notification settings and tab controls readable, keyboard-accessible and responsive on desktop, tablet and phone. Clearly explain that task notifications require the SYNTH page to remain loaded; do not imply browser-closed/Web Push delivery.

## Notification setup suggestion

- [x] Show a small, non-blocking notification suggestion above the composer in both SYNTH ASSISTANT and SYNTHCODE whenever that workspace's task notification is not set up.
- [x] Provide an **Enable** action that requests browser permission only on the user's click and enables that workspace's notification category. If browser permission is denied, explain how to change site permission rather than repeatedly prompting; hide the suggestion where browser notifications are unsupported.
- [x] Provide a close control that snoozes the suggestion only for the current tab session while setup remains incomplete. Re-show it in a later session until that workspace is configured, and keep it hidden after setup.
- [x] Keep the suggestion compact, accessible and responsive, and never block the task composer or normal workspace behavior.

## Assistant response formatting and website sources

- [x] Render valid Markdown headings, unordered/ordered lists, paragraphs, inline emphasis/code/links, blockquotes and fenced code as formatted content instead of showing heading hashes or list markers as raw characters; keep ordinary literal hash characters as content.
- [x] Carry structured source metadata from website-search/page-reader and approved public GitHub/YouTube results through the existing Assistant and SYNTHCODE tool events to the response that used them. Keep it bounded, deduplicated, HTTPS-only, response-scoped and safe to render; do not add it to server-side activity/training records or expose backend identifiers.
- [x] Add an accessible per-response Sources disclosure with compact source previews (title, website/host and excerpt) and an explicit safe external link. Keep the existing response toolbar and tool activity; improve expanded website-tool results so visitors can review source previews without a wall of raw URL text.
- [x] Keep the new formatting and source-review UI readable and usable on desktop, tablet and phone, within SYNTH's existing dark-glass visual style.

## Optional UnoRouter fallback

- [x] Add UnoRouter as a disabled-by-default server-side fallback in the existing Assistant and SYNTHCODE routing chain. Keep its API key out of client bundles and logs; skip it when disabled, unconfigured, or misconfigured, and preserve the existing provider order and normal behavior.
- [x] Restrict every UnoRouter request to configured model IDs ending exactly in `:free`; never route to paid model IDs or spend UnoRouter balance. Keep the optional route text-only unless a specific free model is verified for image input; the initial implementation must skip image tasks.
- [x] Honor UnoRouter `Retry-After` in seconds or HTTP-date form on rate limits, bound cooldowns, persist model cooldown timestamps in shared storage with short timeouts, and skip UnoRouter if shared storage is missing or fails its atomic rate-limit reservation. Skip cooling models while continuing to the next eligible model/provider without delaying healthy fallbacks.
- [x] Keep UnoRouter out of image generation, transcription, and Learning Studio model-generated training; report its protected Learning Studio health state using SYNTH's existing safe provider aliases, without displaying model IDs or credentials.
- [x] Document the optional server environment settings and free-only restriction; retain generic user-facing failures, and verify free-model validation, provider order, rate-limit fallback/cooldown, complete tests, and production build.

## SYNTHCODE template gallery

- [x] Add a **Start with a template** section directly below the main prompt box on SYNTHCODE's home screen. Include category filter tabs named **Featured, All, Landing pages, Stores, Portfolio, Games, SaaS, Starters** and functional horizontal navigation arrows. Below the tabs, display a six-card grid with dark-themed thumbnail previews and titles. Clicking any template card must fill the existing prompt input with a detailed starter prompt for that template style and focus the input.

## Expanded workspace Personalization

- [x] Add **Dark, Light, and System** theme choices plus distinct stylish palette options. Apply each theme consistently across the AI workspace, keep existing accent/font/chat/density settings, and have System follow the device's appearance.
- [x] Let users choose a custom workspace background image, preview it, adjust a readability overlay, and remove it. Keep the image local to this browser; do not upload it or send it to an API. Validate and compress accepted raster images before saving them with the existing personalization preferences.
- [x] When a user chooses a theme, show a brief animated message that enters and disappears, including “Switching off the lights” for Dark and a matching message for every other theme. Keep it accessible, respect reduced-motion settings, and preserve current Settings tabs and responsive behavior.
