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

## Safety and accuracy

Never execute generated source or dependencies in the Next.js application, Vercel functions, or the browser preview. Do not describe source generation as compilation, testing, execution, hosting, or deployment. Python/Rust/Go/C++/Node.js backend exports include appropriate source/build/dependency files and local run instructions, but SYNTHCODE does not verify those instructions. TypeScript only transpiles a single `.ts` file for the existing browser preview; it does not type-check or resolve packages.

The research supporting these constraints is retained in `/home/ubuntu/multi-language-research/` and includes official Pyodide, Rust, Go, Emscripten, Next.js, Node.js, MDN, and Vercel documentation.
