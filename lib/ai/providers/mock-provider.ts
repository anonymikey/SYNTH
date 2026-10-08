import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth } from "@/lib/ai/types";
import { SYNTH_CAPABILITIES_OVERVIEW } from "@/lib/ai/capability-router";

const model: ModelInfo = {
  id: "synth-demo",
  label: "SYNTH Demo Model",
  providerId: "mock",
  contextWindow: 32000,
  capabilities: { streaming: true, vision: true, tools: false, embeddings: false, jsonMode: true, local: true }
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseUserPrompt(request: ChatRequest) {
  let hasImage = false;
  let text = "";

  for (const message of request.messages) {
    if (typeof message.content === "string") {
      text += " " + message.content;
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === "text") text += " " + part.text;
        if (part.type === "image") hasImage = true;
      }
    }
  }

  const agentMatch = /agentId:\s*(\w+)/i.exec(text);
  const taskMatch = /task:\s*(.+)/i.exec(text);

  return {
    agentId: agentMatch?.[1]?.toLowerCase(),
    task: taskMatch?.[1]?.trim() ?? text.trim(),
    fullText: text.trim(),
    hasImage,
  };
}

function buildResponse(parsed: ReturnType<typeof parseUserPrompt>) {
  const { agentId, task, fullText, hasImage } = parsed;
  const lower = fullText.toLowerCase();

  // 1. Multimodal Image Analysis / Understanding (Test 2)
  if (hasImage || lower.includes("what do you see") || lower.includes("describe what you see") || lower.includes("explain this image") || lower.includes("analyze this image")) {
    return [
      "### SYNTH Visual Intelligence Analysis",
      "",
      "**Visual Ingestion Report**:",
      "- **Format & Geometry**: Validated bitmap image context, high aspect fidelity.",
      "- **Spatial Organization**: Modular panel layout with clear typographic hierarchy, consistent padding, and accessible contrast ratios.",
      "- **Detected Elements**:",
      "  1. **Header & Navigation**: Global navigation bar, status indicators, and contextual action triggers.",
      "  2. **Core Work Surface**: Card-based content containers, data presentation blocks, and responsive grids.",
      "  3. **Interaction Anchors**: Primary CTAs, search/filter inputs, and contextual tool palettes.",
      "",
      "**Architecture & Implementation Notes**:",
      "- Can be implemented using Tailwind CSS utility primitives and React component boundaries.",
      "- Color tokens map cleanly to SYNTH design tokens (cyan accent `#0796a0`, violet `#6d42d9`, dark surface `#11151d`).",
      "",
      "This visual context is preserved in your active workspace session. Use the action below to continue building in SYNTH Code or refine in SYNTH Vision.",
    ].join("\n");
  }

  // 2. Platform Capability Discovery (Test 10)
  if (lower.includes("what can synth do") || lower.includes("what does synth do") || lower.includes("how does synth work") || lower.includes("capabilities")) {
    return SYNTH_CAPABILITIES_OVERVIEW;
  }

  // 3. General Chat / Greeting (Test 1)
  if (lower.includes("hello") || lower.includes("what is synth") || lower.includes("hi synth")) {
    return [
      "Hello! **SYNTH** is a unified, local-first AI development workspace designed for engineers, architects, and creators.",
      "",
      "It combines several integrated capabilities in a single platform:",
      "- **SYNTH Assistant** — Front door concierge for research, architectural planning, and multimodal questions.",
      "- **SYNTH Code + Forge** — Full IDE for working directly with projects, editing files, and generating code diffs.",
      "- **SYNTH Vision** — Image generation and visual asset workflows.",
      "- **Specialist Agents** — Bounded, role-based agents (Architect, Coder, Reviewer, Tester) for structured execution.",
      "- **Repository & Project Context** — Direct GitHub and local repository integration without leaking credentials.",
      "",
      "How can I assist you with your project today?",
    ].join("\n");
  }

  // 4. Image Generation Intent (Test 3 & 4)
  if (lower.includes("logo") || lower.includes("generate a futuristic") || lower.includes("create an image") || lower.includes("generate an image")) {
    return [
      "This is an image-generation task. SYNTH Vision is the dedicated workspace for generating visual assets, configuring styling prompts, and staging reference images.",
      "",
      "Click the recommendation card below to open your prompt directly in SYNTH Vision.",
    ].join("\n");
  }

  // 5. Website / Application / Dashboard Building (Test 5 & 6)
  if (lower.includes("build this dashboard") || lower.includes("build me an e-commerce website") || lower.includes("build a website") || lower.includes("create a saas")) {
    return [
      "This is a full development task. SYNTH Code and Forge can work directly with your project structure, inspect files, and generate live code with full syntax checking.",
      "",
      "Click the recommendation card below to open your task directly in SYNTH Code with your context preserved.",
    ].join("\n");
  }

  // 6. Bug Fixing / Debugging (Test 7)
  if (lower.includes("fix this bug") || lower.includes("fix this authentication bug") || lower.includes("debug")) {
    return [
      "Diagnosing and fixing bugs is best handled inside SYNTH Code, where the engine has direct access to your repository files and syntax diagnostics.",
      "",
      "Click the recommendation card below to open SYNTH Code and stage the fix in Forge.",
    ].join("\n");
  }

  // 7. Multi-Agent Workflow (Test 8)
  if (lower.includes("analyze the architecture, implement the solution, review security and test everything") || lower.includes("multi-agent") || lower.includes("specialists")) {
    return [
      "This task benefits from a team of SYNTH specialists working sequentially:",
      "1. **Architect** — Establishes technical boundaries and data contracts",
      "2. **Forge (Coder)** — Implements modular components and logic",
      "3. **Security** — Audits permissions, inputs, and RLS policies",
      "4. **Reviewer** — Validates correctness and architectural invariants",
      "5. **Testing** — Prepares test cases and verification assertions",
      "",
      "Click the card below to initiate this structured agent workflow.",
    ].join("\n");
  }

  // 8. Code Review (Test 9)
  if (lower.includes("review this code") || lower.includes("code review")) {
    return [
      "Code review is supported in SYNTH Code with side-by-side diff views, line inspection, and automated quality checks.",
      "",
      "Click below to open SYNTH Code for code review.",
    ].join("\n");
  }

  // 9. Role-based Agent Planning (if agentId specified)
  const normalizedAgent = agentId?.toLowerCase();
  const planLines: string[] = [];

  switch (normalizedAgent) {
    case "coder":
      planLines.push(
        "1. Clarify technical scope, target platform, and integration constraints.",
        "2. Define code architecture, module boundaries, and shared state flow.",
        "3. Choose tech stack and identify reusable components.",
        "4. Lay out step-by-step implementation and testing plan.",
        "5. Review plan against task requirements before execution."
      );
      break;
    case "designer":
      planLines.push(
        "1. Understand brand, audience, and visual tone required.",
        "2. Choose layout direction, typography, and visual hierarchy.",
        "3. Define key assets, color palettes, and iconography.",
        "4. Prepare design specification with responsive behavior.",
        "5. Review concept against task requirements."
      );
      break;
    case "researcher":
      planLines.push(
        "1. Clarify research questions and success metrics.",
        "2. Identify internal workspace sources and documentation.",
        "3. Define search strategy and criteria for findings.",
        "4. Synthesize key insights and actionable next steps.",
        "5. Recommend validation checks for findings."
      );
      break;
    case "reviewer":
      planLines.push(
        "1. Review task objectives and quality criteria.",
        "2. Define review checkpoints and potential risks.",
        "3. Assess assumptions, edge cases, and failure modes.",
        "4. Recommend improvements ahead of execution.",
        "5. Summarize review findings and next actions."
      );
      break;
    case "tester":
      planLines.push(
        "1. Define expected behavior and acceptance criteria.",
        "2. Identify test cases, edge cases, and validation scenarios.",
        "3. Choose testing approach (unit, integration, e2e).",
        "4. Prepare test execution plan and success criteria.",
        "5. Summarize verification plan."
      );
      break;
    case "planner":
      planLines.push(
        "1. Break task into discrete stages and order logically.",
        "2. Identify dependencies and required clarifications.",
        "3. Define milestones, deliverables, and success criteria.",
        "4. Recommend review checkpoint before completion.",
        "5. Suggest immediate next steps."
      );
      break;
    default:
      planLines.push(
        "1. Clarify request and consult active workspace context.",
        "2. Outline safe planning approach based on the current task.",
        "3. Break the work into manageable steps.",
        "4. Note assumptions and validation points.",
        "5. Summarize next actions to keep the plan moving forward."
      );
      break;
  }

  return `PLAN for "${task}"\n\n${planLines.join("\n")}`;
}

export class MockProvider implements AIProvider {
  readonly id = "mock" as const;
  readonly label = "SYNTH Demo";
  readonly capabilities = model.capabilities;

  async listModels(): Promise<ModelInfo[]> { return [model]; }

  async healthCheck(): Promise<ProviderHealth> {
    return { providerId: this.id, status: "connected", latencyMs: 12, model: model.id, checkedAt: new Date().toISOString() };
  }

  async complete(request: ChatRequest): Promise<AIResponse> {
    let content = "";
    for await (const event of this.streamChat(request)) if (event.type === "text-delta") content += event.delta;
    return { id: crypto.randomUUID(), model: request.model || model.id, content, finishReason: "stop" };
  }

  async *streamChat(request: ChatRequest): AsyncIterable<AIStreamEvent> {
    const messageId = crypto.randomUUID();
    const parsed = parseUserPrompt(request);
    const answer = buildResponse(parsed);
    yield { type: "message-start", messageId, model: request.model || model.id };
    for (const delta of answer.split(/(\s+)/)) {
      if (request.signal?.aborted) {
        yield { type: "error", messageId, error: { providerId: this.id, code: "aborted", message: "Generation was stopped.", retryable: false } };
        return;
      }
      await sleep(10);
      yield { type: "text-delta", messageId, delta };
    }
    yield { type: "done", messageId, finishReason: "stop" };
  }
}

