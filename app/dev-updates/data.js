// Dev updates. Add a new entry at the top of the list; the pages are built from this file.
// Fields: slug (the URL), date (YYYY-MM-DD), title, summary, tags, content (one string per paragraph).
export const updates = [
    {
        slug: 'free-tools-for-synth',
        date: '2026-10-28',
        title: 'Free tools: SYNTH can now search, read and calculate',
        summary: 'SYNTH ASSISTANT and SYNTHCODE can call ten free tools while they answer, and you can watch each one run.',
        tags: ['Tools', 'SYNTH ASSISTANT', 'SYNTHCODE'],
        content: [
            'Until now SYNTH answered from what its model already knew. Now it can look things up. Ten free tools are built in: web search, a page reader, Wikipedia search and summaries, weather, currency conversion, Hacker News, cdnjs, a clock and a calculator. None of them needs an account or an API key.',
            'When a tool is used, you see it. A small row appears under the answer with the tool name, what it was asked, a spinner while it works, then a tick and the time it took. Open the row to see the input and a preview of the result. SYNTHCODE shows the same rows on the last request card.',
            'Behind the scenes, SYNTH holds the model\'s tool request back from you, runs the tool on the server and hands the result to the model so it can carry on. One answer can use up to three tools. Every step goes through the same model failover as before, so a slow or dead provider cannot leave you waiting.',
            'The admin dashboard has a new Agent tools section with health, usage and an on/off switch for each tool. The free services have modest rate limits without a key, so a busy site may want to add the optional free keys.',
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
        slug: 'provider-order',
        date: '2026-10-24',
        title: 'Provider order: OpenRouter by default, SPARK gateway optional',
        summary: 'SYNTH keeps working on OpenRouter alone, and can add the SPARK gateway as a second provider when you are ready.',
        tags: ['Routing', 'Reliability'],
        content: [
            'OpenRouter free models are the default and the recommended stable setup. The FreeLLMAPI gateway, which SYNTH calls SPARK, is optional and switched off by default. If it is off, missing or misconfigured, SYNTH carries on with OpenRouter.',
            'Which provider goes first is a setting. When one fails, rejects its key or is slow to answer, SYNTH quietly moves to the next one. With two providers, each gets two tries before the other is used, and a provider that just failed is tried last for a short while so nobody waits on it twice.',
            'The admin dashboard shows the health of each provider, and a diagnostics table records which node answered, how many failovers it took and how long the first token took.',
        ],
    },
    {
        slug: 'synthcore-training-progress',
        date: '2026-10-22',
        title: 'SYNTHCORE: see how SYNTH learns from real use',
        summary: 'Ratings, results and lessons are collected into a readiness score and a per-model view in the admin dashboard.',
        tags: ['SYNTHCORE', 'Admin'],
        content: [
            'The models behind SYNTH are not retrained, and SYNTHCORE does not pretend otherwise. It records what happens in real use: which model handled which kind of task, how reliably and how fast, how people rated the answer, and which lessons it wrote.',
            'The admin dashboard turns this into a readiness percentage, a task coverage view, and a table of what each model contributes and what it appears able to do. Lessons are reviewed by an admin before they are ever added to a prompt.',
            'When the evidence is strong enough, it can be used to choose models by learned results. That step is deliberately left switched off for now.',
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
