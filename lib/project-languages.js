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
  { value: 'web', label: 'Web' },
  { value: 'typescript', label: 'TypeScript' },
  ...Object.entries(SOURCE_PROJECTS).map(([value, project]) => ({ value, label: value === 'backend' ? 'Backend' : project.label })),
]);

export const SOURCE_ONLY_NOTICE = 'Source export only. SYNTHCODE does not compile, test, run, or deploy these files. Download the project and follow its README in your own environment.';

const WEB_LABELS = Object.freeze({ web: 'Web', typescript: 'TypeScript' });

export function isSourceOnlyLanguage(language) {
  return Object.hasOwn(SOURCE_PROJECTS, language);
}

export function languageLabel(language) {
  return SOURCE_PROJECTS[language]?.label || WEB_LABELS[language] || 'Web';
}

export function languageSelectTitle(language) {
  if (language === 'typescript') return 'TypeScript is transpiled for browser preview without full type-checking or package imports.';
  if (isSourceOnlyLanguage(language)) return `${languageLabel(language)} project files are source-only; SYNTHCODE does not compile, test, run, or deploy them.`;
  return 'Web projects preview supported browser code in the sandboxed frame.';
}

export function languageStatus(language) {
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
