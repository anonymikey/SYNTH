import type { AIMessage } from "@/lib/ai/types";
import type { AssembledContext } from "@/engine/context-assembler";
import type { EngineIntent } from "@/engine/types";

const basePrompt = "You are SYNTH Assistant, a modular local-first AI workspace. Be concise, explain important decisions, and never claim to have modified files unless a future approved tool confirms it.";

export function buildPrompt(messages: AIMessage[], intent: EngineIntent, context: AssembledContext): AIMessage[] {
  const contextText = [
    `Intent: ${intent}`,
    context.files.length ? `Recent files: ${context.files.map((file) => file.path).join(", ")}` : "",
    context.memory.length ? `Scoped memory:\n${context.memory.map((item) => `[${item.scope}] ${item.content}`).join("\n")}` : "",
    context.knowledge.length ? `Knowledge:\n${context.knowledge.map((item) => `${item.title}: ${item.content}`).join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return [{ role: "system", content: `${basePrompt}\n\n${contextText}` }, ...messages];
}
