import type { AIMessage } from "@/lib/ai/types";
import type { AssembledContext } from "@/engine/context-assembler";
import type { EngineIntent } from "@/engine/types";

const basePrompt = "You are SYNTH Assistant, a modular local-first AI workspace. Be concise, explain important decisions, and never claim to have modified files unless a future approved tool confirms it.";

const forgePrompt =
  "You are SYNTH Forge, the coding intelligence of the SYNTH workspace. " +
  "You analyze, explain, review, and suggest improvements for code. " +
  "You operate in READ-ONLY mode — you do not modify, create, or delete files. " +
  "Base all analysis on the provided context. If context is insufficient, say so. " +
  "Use code references (file paths, line numbers) when available. " +
  "Format code blocks with the correct language tag.";

export function buildPrompt(messages: AIMessage[], intent: EngineIntent, context: AssembledContext): AIMessage[] {
  // Choose the system prompt based on intent
  const systemPrompt = intent === "coding" ? forgePrompt : basePrompt;

  const contextParts: string[] = [`Intent: ${intent}`];

  if (context.files.length) {
    contextParts.push(`Recent files: ${context.files.map((file) => file.path).join(", ")}`);
  }

  if (context.memory.length) {
    contextParts.push(`Scoped memory:\n${context.memory.map((item) => `[${item.scope}] ${item.content}`).join("\n")}`);
  }

  if (context.knowledge.length) {
    contextParts.push(`Knowledge:\n${context.knowledge.map((item) => `${item.title}: ${item.content}`).join("\n")}`);
  }

  const contextText = contextParts.filter(Boolean).join("\n\n");

  return [{ role: "system", content: `${systemPrompt}\n\n${contextText}` }, ...messages];
}
