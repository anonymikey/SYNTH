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

## Assistant response formatting and website sources

- [x] Render valid Markdown headings, unordered/ordered lists, paragraphs, inline emphasis/code/links, blockquotes and fenced code as formatted content instead of showing heading hashes or list markers as raw characters; keep ordinary literal hash characters as content.
- [x] Carry structured source metadata only from website-search and page-reader tool results through the existing assistant stream to the answer that used those tools. Keep it bounded, deduplicated, HTTP(S)-only, response-scoped and safe to render; do not persist it or expose provider identifiers.
- [x] Add an accessible per-response Sources disclosure with compact source previews (title, website/host and excerpt) and an explicit safe external link. Keep the existing response toolbar and tool activity; improve expanded website-tool results so visitors can review source previews without a wall of raw URL text.
- [x] Keep the new formatting and source-review UI readable and usable on desktop, tablet and phone, within SYNTH's existing dark-glass visual style.
