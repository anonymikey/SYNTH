// SYNTHCODE project modes that generate downloadable source without compiling or executing it.
export const SOURCE_PROJECTS = Object.freeze({
  python: {
    label: 'Python',
    files: 'a Python source file such as main.py, plus README.md with the local run command; include pyproject.toml or requirements.txt when project metadata or dependencies need it',
    prompt: 'Create the requested Python project. Put its entry point in main.py (or a clearly named .py file when the requested structure requires it). Prefer the standard library unless the request needs a package. Add pyproject.toml or requirements.txt when dependencies or project metadata require them. Include a README.md with the Python version range you intend and exact local install/run/test commands. Do not claim those commands were run.',
    validate: (files) => Object.keys(files).some((path) => /\.py$/i.test(path)) || 'Include at least one .py source file.',
  },
  rust: {
    label: 'Rust',
    files: 'Cargo.toml, at least one .rs source file, and README.md with local Cargo commands',
    prompt: 'Create a conventional Cargo project with Cargo.toml and its Rust source under src/ (usually src/main.rs for an executable, or src/lib.rs for a library). Prefer the standard library unless the request needs a crate. Include README.md with exact local cargo check/build/run/test commands appropriate to the project. Do not claim those commands were run.',
    validate: (files) => (Object.hasOwn(files, 'Cargo.toml') && Object.keys(files).some((path) => /\.rs$/i.test(path))) || 'Include Cargo.toml and at least one .rs source file.',
  },
  go: {
    label: 'Go',
    files: 'go.mod, at least one .go source file, and README.md with local Go commands',
    prompt: 'Create a conventional Go module with go.mod and a Go source file (usually main.go). Use a clear module path and a Go language version compatible with the features you use. Prefer the standard library unless the request needs a module. Include README.md with exact local go build/run/test commands. Do not claim those commands were run.',
    validate: (files) => (Object.hasOwn(files, 'go.mod') && Object.keys(files).some((path) => /\.go$/i.test(path))) || 'Include go.mod and at least one .go source file.',
  },
  cpp: {
    label: 'C++',
    files: 'CMakeLists.txt, at least one .cpp/.cc/.cxx source file, and README.md with local build/run commands',
    prompt: 'Create a conventional C++ project using C++17 or newer, with CMakeLists.txt and implementation source under src/ (usually src/main.cpp). Keep dependencies minimal unless the request needs them. Include README.md with exact local configure/build/run commands. Do not claim those commands were run.',
    validate: (files) => (Object.hasOwn(files, 'CMakeLists.txt') && Object.keys(files).some((path) => /\.(?:cpp|cc|cxx)$/i.test(path))) || 'Include CMakeLists.txt and at least one .cpp, .cc, or .cxx source file.',
  },
  backend: {
    label: 'Node.js backend',
    files: 'package.json with a start script, server.js, and README.md with local install/run instructions',
    prompt: 'Create a Node.js backend starter with package.json, server.js, and README.md. Prefer Node.js built-in modules and no dependency unless the request needs a framework; if you add a dependency, declare it in package.json and document npm install. Include a health endpoint and the API behavior the user requested. Add a start script that runs server.js and exact local setup/run instructions. Use placeholder environment-variable names only; never include real secrets. This project is generated as source only and will not be run or deployed by SYNTHCODE. Do not claim it was run.',
    validate: (files) => {
      if (!Object.hasOwn(files, 'server.js')) return 'Include server.js as the backend entry point.';
      if (!Object.hasOwn(files, 'package.json')) return 'Include package.json with a start script.';
      let manifest;
      try { manifest = JSON.parse(files['package.json']); } catch { return 'Use valid JSON in package.json.'; }
      if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return 'Use a JSON object in package.json.';
      if (!manifest.scripts || typeof manifest.scripts.start !== 'string' || !manifest.scripts.start.trim()) return 'Add a start script to package.json.';
      return true;
    },
  },
});

export const LANGUAGE_OPTIONS = Object.freeze([
  { value: 'auto', label: 'Auto (recommended)' },
  { value: 'web', label: 'Web (HTML, CSS & JavaScript)' },
  { value: 'typescript', label: 'TypeScript (browser preview)' },
  ...Object.entries(SOURCE_PROJECTS).map(([value, project]) => ({ value, label: project.label })),
]);

const SUPPORTED_PROJECT_MODES = new Set(LANGUAGE_OPTIONS.filter(({ value }) => value !== 'auto').map(({ value }) => value));

export function normalizeLanguagePreference(value) {
  return LANGUAGE_OPTIONS.some((option) => option.value === value) ? value : 'auto';
}

export const SOURCE_ONLY_NOTICE = 'Source export only. SYNTHCODE does not compile, test, run, or deploy these files. Download the project and follow its README in your own environment.';

const WEB_LABELS = Object.freeze({ web: 'Web', typescript: 'TypeScript' });

export function isSourceOnlyLanguage(language) {
  return Object.hasOwn(SOURCE_PROJECTS, language);
}

export function languageLabel(language) {
  if (language === 'auto') return 'Auto';
  return SOURCE_PROJECTS[language]?.label || WEB_LABELS[language] || 'Web';
}

export function languageSelectTitle(language) {
  if (language === 'auto') return 'For a new project, SYNTHCODE chooses one supported mode based on your request.';
  if (language === 'typescript') return 'TypeScript is transpiled for browser preview without full type-checking or package imports.';
  if (isSourceOnlyLanguage(language)) return `${languageLabel(language)} project files are source-only; SYNTHCODE does not compile, test, run, or deploy them.`;
  return 'Web projects preview supported browser code in the sandboxed frame.';
}

export function languageStatus(language) {
  if (language === 'auto') return 'Auto chooses a project mode';
  if (language === 'typescript') return 'TypeScript transpiles for preview';
  if (isSourceOnlyLanguage(language)) return `${languageLabel(language)} source export only`;
  return 'Enter to build';
}

export function sourceProjectPrompt(language) {
  const project = SOURCE_PROJECTS[language];
  if (!project) return '';
  return [
    `You are SYNTHCODE, a coding agent that generates downloadable ${project.label} project files.`,
    'Reply with one short sentence, then every file you create or change in its own Markdown fenced code block. Put file=relative/path in each opening fence.',
    '',
    'Rules:',
    `- ${project.prompt}`,
    `- Include these project files: ${project.files}. For a new project, include the README and all essential build/dependency manifests. For an existing project, return only changed or added files with their complete contents.`,
    '- SYNTHCODE only generates and exports these files. Do not say or imply that it installed dependencies, compiled, type-checked, tested, executed, hosted, or deployed the project.',
    '- Do not include real credentials, API keys, or private data. Use documented placeholders for configuration.',
    '- Keep files text-based and use explicit file paths in every code fence. A delete fence block must list the path to remove.',
    '- When an image is provided, describe any image-dependent behavior in source; do not claim that server-side or native execution occurred.',
  ].join('\n');
}

export function sourceProjectRetry(language) {
  const project = SOURCE_PROJECTS[language];
  if (!project) return '';
  return `\n\nIMPORTANT: Return one short sentence followed by complete, path-named file blocks. The project is incomplete until it contains ${project.files}. Keep the requested output source-only; do not claim it was built, tested, or run.`;
}

export function autoProjectPrompt() {
  const sourceModeRules = Object.entries(SOURCE_PROJECTS)
    .map(([mode, project]) => `- ${mode}: ${project.prompt} Required files: ${project.files}.`)
    .join('\n');
  return [
    'You are SYNTHCODE, a coding agent that chooses one suitable project format and generates its files.',
    'Choose exactly one best-fit mode from web, typescript, python, rust, go, cpp, or backend. If the user names a supported language or mode, honor it. For a general visual/browser app, prefer web. Choose typescript only for a TypeScript browser project. Choose python for Python-specific scripting, automation, data or science work; backend for a requested Node.js API/server or a full-stack app that needs a server; go for Go-specific network/concurrent services; rust for Rust-specific systems/performance work; cpp for C++-specific native/low-level work.',
    'For requests needing both a browser UI and a server, choose backend and include the necessary static/browser files alongside the server when appropriate. Never return multiple alternative projects.',
    'On the first line output exactly SYNTHCODE_MODE: <mode>, replacing <mode> with one lower-case mode id. Then give one short sentence, followed by each new or changed file in its own fenced code block with file=relative/path on the opening fence and complete contents.',
    'For existing files listed below, return only files that change or are added. To remove a file, use a delete fence and list its path on its own line. Keep the result responsive, accessible, and functional when it is a browser UI.',
    'Mode contracts:',
    '- web: create a small browser app with index.html and optional styles.css/script.js. Use plain HTML, CSS and JavaScript without a build step, modules/imports, server, or external images. Link local files relatively. The preview is a sandboxed browser frame with no server.',
    '- typescript: create index.html, optional styles.css, and exactly one plain browser TypeScript file named script.ts. Keep logic in script.ts; do not use JSX/TSX, packages, modules/imports, Node APIs, or a server/build configuration. SYNTHCODE transpiles it for browser preview but does not fully type-check it.',
    sourceModeRules,
    'Python, Rust, Go, C++, and backend results are source-only exports. SYNTHCODE does not install dependencies, compile, type-check, test, execute, host, or deploy them. Include a useful README with exact local build/run/test instructions and never claim those commands were run.',
    'Do not include real credentials, API keys, or private data; use placeholders for configuration. When an image is provided, inspect it and follow its visible design without claiming generated source was executed.',
  ].join('\n');
}

export function autoProjectRetry(language = '') {
  if (!SUPPORTED_PROJECT_MODES.has(language)) {
    return '\n\nIMPORTANT: Choose exactly one supported mode, output its exact SYNTHCODE_MODE: <mode> marker as the first line, then provide a short sentence and complete path-named file blocks. Include the essential files and, for source-only modes, a README.md with a local build/run/test command. Do not claim the project was run.';
  }
  const requirement = language === 'typescript'
    ? 'Include index.html and exactly one plain TypeScript source file named script.ts; use no imports or packages.'
    : language === 'web'
      ? 'Include an index.html page and use plain browser HTML, CSS and JavaScript.'
      : sourceProjectRetry(language).trim();
  return `\n\nIMPORTANT: Keep your chosen mode as ${language}. Put SYNTHCODE_MODE: ${language} on the first line, then return a short sentence and complete path-named file blocks. ${requirement}`;
}

export function parseProjectMode(response) {
  const firstLine = String(response || '').replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].trim();
  const match = firstLine.match(/^SYNTHCODE_MODE\s*:\s*([a-z]+)\s*$/i);
  const mode = match?.[1]?.toLowerCase() || '';
  return SUPPORTED_PROJECT_MODES.has(mode) ? mode : '';
}

export function inferProjectMode(files) {
  const fileMap = files && typeof files === 'object' ? files : {};
  const paths = Object.keys(fileMap).map((path) => path.replaceAll('\\', '/').toLowerCase());
  const candidates = new Set();
  if (paths.some((path) => /\.py$/.test(path))) candidates.add('python');
  if (paths.some((path) => /\.rs$/.test(path)) || paths.includes('cargo.toml')) candidates.add('rust');
  if (paths.some((path) => /\.go$/.test(path)) || paths.includes('go.mod')) candidates.add('go');
  if (paths.some((path) => /\.(?:cpp|cc|cxx)$/.test(path)) || paths.includes('cmakelists.txt')) candidates.add('cpp');
  const packageJson = String(fileMap['package.json'] || '');
  if (paths.includes('server.js') || paths.some((path) => /(?:^|\/)(?:server|api)\.(?:mjs|cjs)$/.test(path))
    || (paths.includes('package.json') && /"start"\s*:/.test(packageJson) && !paths.some((path) => /(^|\/)index\.html$/.test(path)))) candidates.add('backend');
  if (candidates.size > 1) return '';
  if (candidates.size === 1) return [...candidates][0];
  const hasHtml = paths.some((path) => /\.html$/.test(path));
  const hasTypeScript = paths.some((path) => /\.ts$/.test(path) && !/\.d\.ts$/.test(path));
  if (hasHtml && hasTypeScript) return 'typescript';
  if (hasTypeScript) return 'typescript';
  if (hasHtml) return 'web';
  return '';
}

export function resolveProjectMode(response, files) {
  return parseProjectMode(response) || inferProjectMode(files);
}

export function stripProjectModeMarker(response) {
  const text = String(response || '');
  const firstLine = text.split(/\r?\n/, 1)[0].replace(/^\uFEFF/, '').trim();
  if (!/^SYNTHCODE_MODE\s*:/i.test(firstLine)) return text;
  const newline = text.search(/\r?\n/);
  if (newline < 0) return '';
  return text.slice(newline).replace(/^\r?\n(?:\r?\n)*/, '');
}

const README_RUN_COMMAND = Object.freeze({
  python: /\b(?:python3?\s+(?:\S+\.py|-m\s+\S+)|uvicorn\s+\S+|pytest\b)/i,
  rust: /\bcargo\s+(?:run|build|test|check)\b/i,
  go: /\bgo\s+(?:run|build|test)\b/i,
  backend: /\b(?:npm\s+(?:start|run\s+start)|node\s+server\.js)\b/i,
});

function hasLocalInstructions(readme, language) {
  const text = String(readme || '').trim();
  if (text.length < 12) return false;
  if (language !== 'cpp') return README_RUN_COMMAND[language]?.test(text) || false;
  return /(?:g\+\+|clang\+\+)[^\n]*-o\s+\S+/i.test(text)
    || /cmake\s+-S\b[\s\S]*?\bcmake\s+--build\b/i.test(text);
}

export function sourceProjectIssue(files, language) {
  const project = SOURCE_PROJECTS[language];
  if (!project) return '';
  if (!Object.hasOwn(files, 'README.md') || typeof files['README.md'] !== 'string') return 'Include README.md with local setup and build/run instructions.';
  if (!hasLocalInstructions(files['README.md'], language)) return `Add a local ${languageLabel(language)} build/run/test command to README.md.`;
  const result = project.validate(files);
  return result === true ? '' : result;
}

export function sourceProjectEntry(files, language) {
  const paths = Object.keys(files).sort();
  const preferred = {
    python: ['main.py', 'src/main.py', 'app.py', 'src/app.py'],
    rust: ['src/main.rs', 'src/lib.rs', 'main.rs', 'lib.rs'],
    go: ['main.go'],
    cpp: ['src/main.cpp', 'main.cpp', 'src/main.cc', 'main.cc', 'src/main.cxx', 'main.cxx'],
    backend: ['server.js'],
  }[language] || [];
  return preferred.find((path) => Object.hasOwn(files, path))
    || paths.find((path) => {
      if (language === 'python') return /\.py$/i.test(path);
      if (language === 'rust') return /\.rs$/i.test(path);
      if (language === 'go') return /\.go$/i.test(path);
      if (language === 'cpp') return /\.(?:cpp|cc|cxx)$/i.test(path);
      if (language === 'backend') return /\.(?:js|mjs|cjs)$/i.test(path);
      return false;
    }) || '';
}
