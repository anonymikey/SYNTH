import type { SuggestedPrompt } from "@/modules/assistant/types";

export const AGENT_MODES = [
  { value: "assistant", label: "Assistant", description: "General reasoning and conversation" },
  { value: "architect", label: "Architect", description: "Shape systems and implementation plans" },
  { value: "researcher", label: "Researcher", description: "Compare sources and surface context" },
  { value: "reviewer", label: "Reviewer", description: "Audit changes and identify risks" },
] as const;

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { id: "explain-code", label: "Explain this code", prompt: "Explain this code and the intent behind its structure.", icon: "code-2", tone: "blue" },
  { id: "build-component", label: "Build a React component", prompt: "Build a clean, reusable React component for this project.", icon: "blocks", tone: "cyan" },
  { id: "summarize-doc", label: "Summarize a document", prompt: "Summarize the most important decisions in this document.", icon: "file-text", tone: "violet" },
  { id: "learn-python", label: "Learn Python", prompt: "Teach me this Python concept with a small practical example.", icon: "book-open", tone: "green" },
  { id: "plan-project", label: "Plan a project", prompt: "Create an implementation plan for this project.", icon: "map", tone: "blue" },
  { id: "debug-app", label: "Debug my application", prompt: "Help me debug this application and explain the root cause.", icon: "bug", tone: "violet" },
];
