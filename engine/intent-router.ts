import type { EngineIntent, EngineRequest } from "@/engine/types";
import { detectCapabilityIntent } from "@/lib/ai/capability-router";

export function routeIntent(request: EngineRequest): EngineIntent {
  if (request.intent) return request.intent;

  // Extract user text and image signals if available
  const lastUserMessage = [...request.messages].reverse().find((m) => m.role === "user");
  let userText = "";
  let hasImage = false;

  if (lastUserMessage) {
    if (typeof lastUserMessage.content === "string") {
      userText = lastUserMessage.content;
    } else if (Array.isArray(lastUserMessage.content)) {
      for (const part of lastUserMessage.content) {
        if (part.type === "text") userText += " " + part.text;
        if (part.type === "image") hasImage = true;
      }
    }
  }

  if (userText) {
    const result = detectCapabilityIntent({
      userMessage: userText,
      attachments: hasImage ? [{ id: "temp", name: "attachment", kind: "image", size: 1024 }] : [],
    });

    if (result.intent === "image_analysis" || result.intent === "image_generation") return "vision";
    if (result.intent === "website_building" || result.intent === "application_building" || result.intent === "bug_fixing" || result.intent === "refactoring" || result.intent === "code_review") return "coding";
    if (result.intent === "multi_agent_task") return "planning";
    if (result.intent === "research") return "research";
  }

  if (request.agentId === "researcher" || request.mode === "researcher") return "research";
  if (request.agentId === "planner" || request.mode === "architect") return "planning";
  if (request.agentId === "reviewer" || request.mode === "reviewer") return "review";
  if (request.agentId === "coder") return "coding";
  return "conversation";
}
