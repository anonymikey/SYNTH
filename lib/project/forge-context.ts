/**
 * Forge Context Builder — constructs rich, bounded coding context for SYNTH Forge actions.
 * Packages real project/file metadata into the user message so the model has actual
 * repository context to reason about.
 *
 * The context is sent as part of the user message (via explicitText) and flows
 * through the existing SynthEngine → prompt-manager → provider pipeline.
 */

import type { ProjectFileContent, ProjectInfo, ProjectSearchResult } from "@/lib/project/use-project";

/** Max characters of file content to include in context */
const MAX_FILE_CONTENT_CHARS = 24_000;

/** Max characters for search snippets */
const MAX_SNIPPET_CHARS = 200;

/* ------------------------------------------------------------------ */
/*  Context types                                                      */
/* ------------------------------------------------------------------ */

export interface ForgeCodingContext {
  /** Project metadata */
  project: ProjectInfo;
  /** Currently selected file content (if loaded) */
  fileContent: ProjectFileContent | null;
  /** Recent files for bounded project context */
  recentFiles: string[];
  /** Optional search results for search-assisted actions */
  searchResults?: ProjectSearchResult[];
}

/* ------------------------------------------------------------------ */
/*  Action-specific prompt templates                                   */
/* ------------------------------------------------------------------ */

const FORGE_IDENTITY =
  "You are SYNTH Forge, the coding intelligence of the SYNTH workspace. You analyze, explain, and review code with precision. You operate in READ-ONLY mode — you do not modify, create, or delete any files.";

const READ_ONLY_CONSTRAINT =
  "IMPORTANT: This is a READ-ONLY analysis. Do not claim to have modified anything. Do not invent files or repository state that is not provided. Base your entire analysis on the supplied context. If information is missing, say so explicitly.";

interface ForgeActionTemplate {
  label: string;
  instruction: string;
  includeSearchResults: boolean;
}

const ACTION_TEMPLATES: Record<string, ForgeActionTemplate> = {
  "Explain file": {
    label: "Explain File",
    instruction:
      "Provide a thorough explanation of this file. Cover: purpose, exports, key abstractions, dependencies, and how it fits into the broader architecture. Use code references where helpful.",
    includeSearchResults: false,
  },
  "Review code": {
    label: "Review Code",
    instruction:
      "Perform a thorough code review. Identify: potential bugs, design issues, naming concerns, error handling gaps, performance issues, and maintainability concerns. Rate overall quality and suggest specific improvements with code examples.",
    includeSearchResults: false,
  },
  "Find potential bugs": {
    label: "Find Potential Bugs",
    instruction:
      "Analyze this code for potential bugs. Look for: null/undefined risks, race conditions, off-by-one errors, incorrect type handling, missing error handling, resource leaks, incorrect async patterns, and logic errors. For each issue found, explain the risk and suggest a fix.",
    includeSearchResults: true,
  },
  "Summarize file": {
    label: "Summarize File",
    instruction:
      "Provide a concise summary of this file. Include: what it does, its key exports/interfaces, dependencies, and its role in the project. Keep it under 200 words.",
    includeSearchResults: false,
  },
  "Suggest refactor": {
    label: "Suggest Refactor",
    instruction:
      "Analyze this code and suggest refactoring opportunities. Consider: extracting functions, simplifying logic, improving type safety, reducing duplication, better naming, and architectural improvements. Provide concrete code examples for each suggestion.",
    includeSearchResults: true,
  },
};

/* ------------------------------------------------------------------ */
/*  Context builder                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build the full prompt text for a SYNTH Forge action.
 * Returns the user message content that includes identity, context, and instruction.
 */
export function buildForgePrompt(
  actionLabel: string,
  context: ForgeCodingContext,
): string {
  const template = ACTION_TEMPLATES[actionLabel] ?? {
    label: actionLabel,
    instruction: `Analyze the selected file and provide insights about: ${actionLabel.toLowerCase()}.`,
    includeSearchResults: false,
  };

  const sections: string[] = [];

  // 1. Identity + read-only constraint
  sections.push(FORGE_IDENTITY);
  sections.push(READ_ONLY_CONSTRAINT);

  // 2. Project context
  sections.push(buildProjectSection(context.project));

  // 3. File content
  if (context.fileContent) {
    sections.push(buildFileSection(context.fileContent));
  } else {
    sections.push("## Selected File\n\nNo file is currently selected. Select a file in the Explorer to analyze it.");
  }

  // 4. Recent files (bounded context)
  if (context.recentFiles.length > 0) {
    const fileList = context.recentFiles
      .slice(0, 8)
      .map((f) => `- ${f}`)
      .join("\n");
    sections.push(`## Recent Files\n\n${fileList}`);
  }

  // 5. Search results (for Find Bugs / Suggest Refactor)
  if (template.includeSearchResults && context.searchResults && context.searchResults.length > 0) {
    const snippets = context.searchResults
      .slice(0, 6)
      .map((r) => {
        const loc = r.line ? `:${r.line}` : "";
        return `- **${r.path}${loc}**: ${r.snippet.slice(0, MAX_SNIPPET_CHARS)}`;
      })
      .join("\n");
    sections.push(`## Related References\n\n${snippets}`);
  }

  // 6. Action instruction
  sections.push(`## Action: ${template.label}\n\n${template.instruction}`);

  return sections.join("\n\n");
}

/* ------------------------------------------------------------------ */
/*  Section builders                                                   */
/* ------------------------------------------------------------------ */

function buildProjectSection(project: ProjectInfo): string {
  const lines = [`## Project: ${project.name}`];

  if (project.github) {
    lines.push(`- **Repository**: ${project.github.owner}/${project.github.repo}`);
    lines.push(`- **Branch**: ${project.github.ref}`);
    lines.push(`- **Source**: GitHub (read-only)`);
  } else {
    lines.push(`- **Source**: ${project.adapterType === "local" ? "Local filesystem" : "Demo project"}`);
  }

  lines.push(`- **Language**: ${project.language}`);
  lines.push(`- **Files**: ${project.fileCount}`);
  lines.push(`- **Mode**: READ-ONLY`);

  return lines.join("\n");
}

function buildFileSection(file: ProjectFileContent): string {
  const lines = [
    `## Selected File: ${file.path}`,
    "",
    `- **Language**: ${file.language}`,
    `- **Lines**: ${file.lineCount}`,
    `- **Size**: ${(file.byteSize / 1024).toFixed(1)} KB`,
    "",
  ];

  const content = file.content;

  if (content.length > MAX_FILE_CONTENT_CHARS) {
    // Truncate safely at a line boundary
    const truncated = content.slice(0, MAX_FILE_CONTENT_CHARS);
    const lastNewline = truncated.lastIndexOf("\n");
    const safeContent = lastNewline > 0 ? truncated.slice(0, lastNewline) : truncated;
    const omittedLines = file.lineCount - safeContent.split("\n").length;

    lines.push("```" + file.language);
    lines.push(safeContent);
    lines.push("```");
    lines.push("");
    lines.push(`⚠️ File truncated — ${omittedLines} lines omitted (${((content.length - MAX_FILE_CONTENT_CHARS) / 1024).toFixed(0)} KB). Analyze what is shown above.`);
  } else {
    lines.push("```" + file.language);
    lines.push(content);
    lines.push("```");
  }

  return lines.join("\n");
}
