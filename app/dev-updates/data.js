// Dev updates. Add a new entry at the top of the list; the pages are built from this file.
// Fields: slug (the URL), date (YYYY-MM-DD), title, summary, tags, content (one string per paragraph).
export const updates = [
    {
        slug: 'animated-workspace-composer-prompts',
        date: '2026-11-18',
        title: 'More expressive prompts, without extra effort',
        summary: 'SYNTH ASSISTANT and SYNTHCODE now cycle through softly typed, context-aware prompt suggestions in empty composer fields.',
        tags: ['New', 'SYNTH ASSISTANT', 'SYNTHCODE', 'Workspace'],
        content: [
            'The empty Assistant composer now cycles between short ideas for chat or image creation. SYNTHCODE’s composer changes its suggestions for a new project, an edit, a queued follow-up or a clarification.',
            'The animated text is only a placeholder; it never changes or sends what you type. Focusing an empty field restores its normal static placeholder, while entered text replaces it normally. The effect adapts to reduced-motion settings and remains available on phones and desktop.',
        ],
    },
    {
        slug: 'personalized-antigravity-and-polished-web-projects',
        date: '2026-11-16',
        title: 'A more personal workspace and polished web projects',
        summary: 'Choose SYNTH’s animated Antigravity background, while new SYNTHCODE web projects start as complete, styled, responsive pages.',
        tags: ['New', 'Personalization', 'SYNTHCODE', 'Design'],
        content: [
            'SYNTH ASSISTANT and SYNTHCODE now share the Antigravity animated-particle background across the full workspace. In Settings → Personalization → Workspace background, choose Antigravity or the original static background. Your choice is saved on this device, and existing themes, accents, fonts, text size, chat style, density and uploaded wallpaper preferences remain in place.',
            'The background stays behind the workspace controls. If WebGL2 is unavailable, SYNTH keeps its original static backdrop. Animation also respects reduced-motion preferences and pauses when the page is hidden or the effect is off screen.',
            'New SYNTHCODE Web projects are now generated as complete, self-contained HTML pages with embedded CSS, a viewport setting, a modern font stack, a cohesive color palette, responsive layout, sensible spacing, styled headings, buttons and cards, and accessible contrast. SYNTHCODE should not leave default unstyled HTML. When editing an imported repository, it continues to respect that project’s existing design system and stylesheet structure.',
        ],
    },
    {
        slug: 'synthcode-github-repository-workflow',
        date: '2026-11-16',
        title: 'New: bring a GitHub project into SYNTHCODE',
        summary: 'Connect a GitHub account, import selected project files, edit them in SYNTHCODE, and review changes in a new pull request branch.',
        tags: ['New', 'Integrations', 'GitHub', 'SYNTHCODE'],
        content: [
            'SYNTH now has a GitHub integration in the workspace sidebar under Settings → Integrations. The workspace owner must configure a GitHub App and shared Upstash storage first. Each user connects their own GitHub account and selects the repositories the app may access; SYNTH never asks for a personal access token.',
            'In SYNTHCODE, choose an authorized repository and branch, then select only the text files you want to import. Credential-like files, GitHub workflow files, unsafe paths, binaries, and oversized files are excluded or rejected. Imported files join the current SYNTHCODE project and can be edited using the repository’s existing file structure and language. They are sent to SYNTH’s configured AI services when you ask for an edit, so do not import secrets or confidential files you do not want processed by those services. Each request includes up to 40,000 source characters and prefers the open file when it fits, so not every imported file may fit; open the relevant file before asking for a change.',
            'Repository code is not run when it is imported. A browser project requires a separate approval before its source is loaded in SYNTHCODE’s isolated preview. Imported TypeScript, Python, Rust, Go, C++, and backend projects remain source-only; SYNTHCODE does not compile, test, or run them.',
            'Review the changed file list before submitting. SYNTH creates a separate branch and opens a pull request only after you authorize that action. It does not change the base branch, merge the pull request, deploy the project, or guarantee that GitHub checks will pass. The working copy lives only in the current page and can be lost on refresh; download it or submit your changes before leaving. If the connection is unavailable or a path conflicts with a newer GitHub change, the current-page working copy remains available.',
            'GitHub is the first direct platform connector. A project created with Claude, Replit, GitHub Copilot, or v0 can use this workflow when it is available in a GitHub repository and the user independently authorizes that repository. SYNTH does not connect to those products’ accounts or obtain their private project/deployment context.',
        ],
    },
    {
        slug: 'synth-bridge-free-text-routing',
        date: '2026-11-14',
        title: 'An additional guarded text fallback is available',
        summary: 'SYNTH Bridge can be enabled as a last-resort text route with live free-price checks and a shared account-level rate guard.',
        tags: ['Routing', 'Reliability', 'Privacy'],
        content: [
            'Workspace owners can optionally enable SYNTH Bridge for text responses in SYNTH ASSISTANT and SYNTHCODE. It is disabled by default and is only tried in the order configured for the workspace.',
            'Before a request is sent, SYNTH checks that a candidate is currently marked free, healthy and zero-priced for input and output. A shared account-wide request reservation and persistent cooldowns help keep traffic within free-tier limits; if shared storage or live price verification is unavailable, SYNTH skips the route.',
            'Free allowances and availability may change. Text and code routed through this option may be processed by an upstream model operator whose retention and training practices differ. This route is not used for images, transcription or Learning Studio analysis. Avoid sending sensitive information and review current service terms before enabling it.',
        ],
    },
    {
        slug: 'synth-connect-free-text-fallback',
        date: '2026-11-13',
        title: 'An optional free-text fallback joins SYNTH routing',
        summary: 'SYNTH Connect can be enabled as a free-only text fallback, with shared rate-limit protection and clear privacy guidance.',
        tags: ['Routing', 'Reliability', 'Privacy'],
        content: [
            'Workspace owners can optionally enable SYNTH Connect as a text-only fallback for Assistant and SYNTHCODE. It is off by default and does not replace the current primary services.',
            'The workspace accepts only model IDs explicitly marked free. A shared per-model request reservation, bounded cooldowns and upstream Retry-After guidance help prevent repeated rate-limit hits; if shared storage is unavailable, the fallback is skipped. Free-model availability can still vary, so normal configured services remain the preferred route.',
            'This fallback does not handle image input, image creation, voice transcription or Learning Studio analysis. Requests sent through it may be processed by an upstream model service with different data-retention and training policies. Avoid submitting sensitive information, and review current service terms before enabling it.',
        ],
    },
    {
        slug: 'synthcode-multilanguage-projects',
        date: '2026-11-06',
        title: 'SYNTHCODE grows beyond browser projects',
        summary: 'Preview Web and TypeScript projects, or export Python, Rust, Go, C++ and Node.js backend starter source with local run guides.',
        tags: ['SYNTHCODE', 'Languages', 'Source export', 'TypeScript'],
        content: [
            'SYNTHCODE now offers Web, TypeScript, Python, Rust, Go, C++ and Node.js backend project modes. Choose a mode before the first request. Source projects can include multiple files, language-aware file badges, local setup/run instructions in README.md, Code-tab editing, and a ZIP download.',
            'Web projects continue to use the existing sandboxed browser preview. The TypeScript mode transpiles one plain .ts file to browser JavaScript for that preview and includes the generated JavaScript in the project download. This is transpilation only: it does not provide full type-checking or resolve external packages.',
            'Python, Rust, Go, C++ and Node.js backend modes generate source files only. They include conventional entry files and project metadata where appropriate, such as Cargo.toml, go.mod, CMakeLists.txt, or a package.json start script, plus README.md with local commands. SYNTHCODE does not install dependencies, compile, test, run, host, or deploy these projects, and it cannot verify that their code or local instructions work.',
            'Download the ZIP and follow its README in your own development environment. Node.js backend starters are source packages, not live servers or hosted APIs. Any configuration values use placeholders; never put private credentials into generated files.',
            'The landing page, SYNTHCODE workspace banner and Dev Updates now share this release announcement. Dismissing it is saved in this browser only; it does not sync to other devices.',
        ],
    },
    {
        slug: 'synthcore-learning-failover',
        date: '2026-11-05',
        title: 'SYNTHCORE learning has stronger automatic recovery',
        summary: 'Learning jobs can recover from busy services, slow responses and invalid output, with the result visible in SYNTH Learning Studio.',
        tags: ['SYNTHCORE', 'Reliability', 'Learning Studio'],
        content: [
            'Scheduled and manual learning now recover more reliably. If an AI service is busy, slow or returns unusable learning data, SYNTHCORE can try another enabled and configured option rather than ending the run immediately.',
            'The SYNTH Learning Studio retains the outcome of the latest run, which service completed it, and whether recovery was needed. If a run still fails, the workspace records the relevant diagnostics for review.',
            'Only services enabled and configured for the workspace are used. SYNTHCORE continues to collect task evidence and reviewed prompt lessons; this does not fine-tune external AI systems or make SYNTHCORE a first-party response engine.',
        ],
    },
    {
        slug: 'assistant-response-actions',
        date: '2026-11-05',
        title: 'More control over every SYNTH response',
        summary: 'Copy, rate, listen to, share and regenerate Assistant replies and SYNTHCODE build outputs; build answers include a concise summary and expandable full response.',
        tags: ['Assistant', 'Feedback', 'Privacy'],
        content: [
            'Completed Assistant replies and successful SYNTHCODE build outputs now include actions to copy the full answer, rate it helpful or not helpful, listen with your browser’s speech synthesis, share it, and inspect response details. SYNTHCODE keeps project activity compact by showing the answer summary and letting you expand the complete Markdown output above its toolbar. Speech controls support play, pause, resume and stop where the browser provides speech synthesis. The current SYNTHCODE build can also be regenerated with its original screenshot and current project files; earlier build outputs retain the other actions but are not replayed without their historical project snapshot.',
            'A negative rating can include a category—such as inaccurate information, poor explanation, irrelevant response or incomplete answer—and an optional note. The rating and note update the existing activity record rather than creating duplicate feedback events. The SYNTH Learning Studio shows the category, note and links to regenerated answers; rating changes continue to adjust SYNTHCORE’s existing learning signal.',
            'Sharing uses the native share sheet when available. The link fallback requires a separate confirmation and includes only the selected response, never its prompt or conversation history. Its unguessable link expires after 24 hours and is excluded from search indexing. Persistent storage is required for production links; without it, the toolbar offers copy-text fallback instead.',
            'Assistant regeneration runs through the existing streaming chat route using the messages before the selected answer, then replaces that answer in place while preserving the remaining transcript. SYNTHCODE uses its existing file-aware build pipeline and the current project state. A new linked activity record is created for each successful regeneration. Generated-image responses can be regenerated through their existing image endpoint as well.',
            'These interactions improve SYNTHCORE’s evidence and Learning Studio visibility; they do not retrain external AI systems or expose conversations through public links.',
        ],
    },
    {
        slug: 'synth-media-tools',
        date: '2026-11-05',
        title: 'SYNTH Image Master and workspace personalization',
        summary: 'Optional image and voice tools, refined composers, and device-saved workspace personalization bring more ways to create.',
        tags: ['SYNTH Image Master', 'Voice', 'Images', 'Personalization', 'SYNTHCODE'],
        content: [
            'SYNTH includes optional image and voice features through connected external services. They must be enabled and configured for the workspace, depend on service availability, and follow the connected account’s terms, limits and any charges.',
            'SYNTH Image Master provides image creation, while voice input can transcribe speech into text. Image attachments in chat are processed to help answer the current request. Avoid entering personal or confidential information.',
            'The Assistant and SYNTHCODE composers now use the same compact, grouped toolbar. You can attach screenshots or sketches in SYNTHCODE, use voice transcription when it is available, edit project files, preview responsive layouts, and download your work.',
            'Settings in the workspace sidebar open Personalization. Theme, accent, font, text size, chat style and density are saved in local storage in this browser; they do not sync automatically to other devices. Capability banners appear on the landing page, in both workspaces, and here in Dev Updates. Clicking a banner action or dismissing it stores a shared local dismissal flag, so the announcement does not return on this browser.',
            'SYNTHCORE continues to record task outcomes, service attribution, ratings and lessons for the SYNTH Learning Studio. External AI systems are not retrained. Lessons follow the configured review and approval process before they are added to prompts.',
        ],
    },
    {
        slug: 'free-tools-for-synth',
        date: '2026-10-28',
        title: 'Useful tools: SYNTH can now search, read and calculate',
        summary: 'SYNTH ASSISTANT and SYNTHCODE can call ten tools while they answer, and you can watch each one run.',
        tags: ['Tools', 'SYNTH ASSISTANT', 'SYNTHCODE'],
        content: [
            'SYNTH can now look things up using ten built-in tools: web search, a page reader, Wikipedia search and summaries, weather, currency conversion, Hacker News, cdnjs, a clock and a calculator. Some tools may have usage limits.',
            'When a tool is used, you see it. A small row appears under the answer with the tool name, what it was asked, a spinner while it works, then a tick and the time it took. Open the row to see the input and a preview of the result. SYNTHCODE shows the same rows on the last request card.',
            'SYNTH runs tools on the server and returns the result to the assistant so it can continue its response. One answer can use up to three tools. Automatic recovery helps a slow or unavailable AI service avoid leaving you waiting.',
            'The SYNTH Learning Studio includes an Agent tools section with health, usage and an on/off switch for each tool. External services can have modest rate limits, so availability may vary.',
        ],
    },
    {
        slug: 'synthcode-project-files',
        date: '2026-10-26',
        title: 'SYNTHCODE now works with real project files',
        summary: 'The Code tab is a file explorer. The agent creates and edits files, and you can browse, search and edit them too.',
        tags: ['SYNTHCODE', 'Files'],
        content: [
            'The Code tab used to show a single block of code. It is now a file explorer with a folder tree, file type badges, search and an editor. The agent builds a small project, usually index.html, styles.css and script.js, and can create, edit or delete files as you ask for changes.',
            'While it works, you see files appear in the tree one by one, each with a spinner and then a tick, while the file being written streams on the right. Click any file at any time to look at it.',
            'You can add files and folders, edit a file and save it, or delete it. The agent receives your edits on the next request, so you and the agent are always working on the same files.',
            'Preview assembles the project into one page and runs it in a sandboxed frame. Download gives you a zip of every file. A single file downloads as itself.',
        ],
    },
    {
        slug: 'synth-routing-and-reliability',
        date: '2026-10-24',
        title: 'SYNTH routing and automatic recovery',
        summary: 'SYNTH can use configured AI services and move on when an option is unavailable or slow.',
        tags: ['Routing', 'Reliability'],
        content: [
            'SYNTH can use the AI services configured for the workspace. Optional services can be enabled when ready; if an option is off, missing or misconfigured, SYNTH continues with the remaining available setup.',
            'The order can be configured for the workspace. When one option fails, rejects a request or is slow to answer, SYNTH can move to the next one. A service that just failed is temporarily deprioritized so a request does not repeatedly wait on the same issue.',
            'The SYNTH Learning Studio shows workspace health and diagnostics, including how many recovery attempts were needed and how long the first response took.',
        ],
    },
    {
        slug: 'synthcore-training-progress',
        date: '2026-10-22',
        title: 'SYNTHCORE: see how SYNTH learns from real use',
        summary: 'Ratings, outcomes and lessons are collected into readiness insights and a workspace-wide capability view.',
        tags: ['SYNTHCORE', 'Learning Studio'],
        content: [
            'External AI systems are not retrained by SYNTHCORE. It records what happens in real use: which kinds of tasks were handled, how reliably and how quickly, how people rated the answer, and which lessons were suggested.',
            'The SYNTH Learning Studio turns this information into readiness insights, task coverage and a reviewable summary of what SYNTH has learned. Lessons are reviewed before they are added to a prompt.',
            'When the evidence is strong enough, it can help guide future task routing. That step remains deliberately switched off for now.',
        ],
    },
    {
        slug: 'new-look-and-workspace',
        date: '2026-10-20',
        title: 'A new look: landing page, workspace and sidebar',
        summary: 'A new landing page, a workspace with a hover-and-pin sidebar, and a welcome screen for SYNTHCODE.',
        tags: ['Design', 'Workspace'],
        content: [
            'SYNTH has a new landing page with a prompt box that takes you straight into the workspace, scroll animations and a visual walkthrough of how it works.',
            'The workspace keeps its sidebar out of the way. Move the cursor to the left edge and it slides in, or pin it to keep it open. On phones and tablets it becomes a drawer opened from a menu button.',
            'SYNTHCODE opens with a welcome screen of ideas and a prompt bar, then moves into a code and preview workspace that shows clearly when something is being built.',
        ],
    },
];

export const getUpdate = (slug) => updates.find((u) => u.slug === slug);

// "2026-10-28" -> "28 October 2026". UTC, so the server and the browser always agree.
export const formatDate = (iso) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
