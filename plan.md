# SYNTHCODE multi-language project export — implementation plan

## Approved scope and architecture

The user selected **source generation/export only** for Python, Rust, Go, C++, and Node.js backend starter projects. SYNTHCODE must not compile, test, execute, host, or deploy those source-only projects. Keep the existing Web browser preview and TypeScript browser transpile/preview. TypeScript remains transpile-only; it does not provide full type-checking or package installation. Do not add an execution service, container runner, new cloud provider, server-side `exec`, or a paid external dependency.

The project remains a Next.js application on Vercel. The existing streaming build pipeline, client-side project-file parser, Code explorer/editor, and ZIP exporter remain the source-generation path. No new API route is needed. The iframe stays reserved for Web and TypeScript browser previews.

`components/Builder.js` owns language selection before a project starts, language-aware prompts/retry/validation, source-only completion state, Code-view default, and download behavior. `lib/project-languages.js` owns source-mode labels, instructions, entry selection, and essential-file validation. `lib/files.js` recognizes new language fences and file badges. `components/CapabilityBanner.js` announces the release across the landing page, workspace, and Dev Updates. `components/landing/Landing.js`, `app/page.js`, and `app/dev-updates/data.js` describe the shipped capability and boundary. Tests cover the mode registry, file formats, project validity, and public copy.

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

**Layout paradigm:** Preserve SYNTHCODE's split work surface: project/history and prompt controls on one side, the Code/Preview stage on the other. Select the project mode in the composer before generation; source-only projects open directly in Code, while Preview explains the limitation and offers working navigation/download actions.

**Signature elements:** Retain the subtle dotted-grid background, cyan-to-blue-to-violet gradients, and compact rounded chips/status indicators.

**Interaction and animation:** Reuse the existing live file stream, retry behavior, responsive tabs, project download, banner dismissal, and reduced-motion handling. Do not add simulated compilation or decorative run buttons.

**Typography:** Use the site's existing configurable heading/body font variables; keep code and file paths in the existing system-monospace treatment. Preserve Personalization's current font choices and user settings.

**Brand essence:** SYNTH is a flexible AI workspace for people who want to think, build, and improve in one place; distinctive for its transparent, file-based workflow. Personality: precise, inventive, candid.

**Brand voice:** Direct and practical; say what runs and what is only exported. Examples: “Generate a source project to run in your own environment.” “Preview supported browser projects before you download them.”

**Wordmark and logo:** Reuse the existing SYNTH wordmark and mark; do not create a competing logo.

**Signature brand color:** SYNTH cyan `#22d3ee`, balanced by the existing blue/violet accent gradient.

## Safety and accuracy

Never execute generated source or dependencies in the Next.js application, Vercel functions, or the browser preview. Do not describe source generation as compilation, testing, execution, hosting, or deployment. Python/Rust/Go/C++/Node.js backend exports include appropriate source/build/dependency files and local run instructions, but SYNTHCODE does not verify those instructions. TypeScript only transpiles a single `.ts` file for the existing browser preview; it does not type-check or resolve packages.

The research supporting these constraints is retained in `/home/ubuntu/multi-language-research/` and includes official Pyodide, Rust, Go, Emscripten, Next.js, Node.js, MDN, and Vercel documentation.
