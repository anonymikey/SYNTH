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
