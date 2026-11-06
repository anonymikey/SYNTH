// Dev updates. Add a new entry at the top of the list; the pages are built from this file.
// Fields: slug (the URL), date (YYYY-MM-DD), title, summary, tags, content (one string per paragraph).
export const updates = [
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
