import type { AIProvider, AIResponse, AIStreamEvent, ChatRequest, ModelInfo, ProviderHealth } from "@/lib/ai/types";

const model: ModelInfo = { id: "synth-demo", label: "SYNTH Demo Model", providerId: "mock", contextWindow: 32000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true } };

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function parseAgentRequest(request: ChatRequest) {
  const joined = request.messages.map((message) => (typeof message.content === "string" ? message.content : "")).join("\n");
  const agentMatch = /agentId:\s*(\w+)/i.exec(joined);
  const taskMatch = /task:\s*(.+)/i.exec(joined);
  return {
    agentId: agentMatch?.[1]?.toLowerCase(),
    task: taskMatch?.[1]?.trim() ?? "your request",
  };
}


function buildAgentResponse(agentId: string | undefined, task: string) {
  const normalizedAgent = agentId?.toLowerCase();
  const planLines: string[] = [];

  switch (normalizedAgent) {
    case "coder":
      planLines.push(
        "1. Clarify the technical scope, target platform, and any integration constraints for the requested task.",
        "2. Define the code architecture, module boundaries, and any shared state or data flow required.",
        "3. Choose a tech stack and identify any reusable components or utilities needed for the implementation.",
        "4. Lay out a step-by-step implementation and testing plan.",
        "5. Review the plan against the task requirements and risks before moving to implementation.",
      );
      break;
    case "designer":
      planLines.push(
        "1. Understand the brand, audience, and visual tone required for the task.",
        "2. Choose a layout direction, typography approach, and visual hierarchy.",
        "3. Define key assets, color palettes, and iconography that support the concept.",
        "4. Prepare a design specification that includes accessibility and responsive behavior.",
        "5. Review the concept against the request and identify refinement points.",
      );
      break;
    case "researcher":
      planLines.push(
        "1. Clarify the research questions and what information will make the task successful.",
        "2. Identify internal workspace sources, documentation, and local knowledge to consult.",
        "3. Define the search strategy and criteria for relevant findings.",
        "4. Summarize key insights and possible next steps.",
        "5. Recommend validation checks or follow-up research tasks.",
      );
      break;
    case "reviewer":
      planLines.push(
        "1. Review the task objectives and any implied quality or correctness criteria.",
        "2. Define review checkpoints and areas of potential risk.",
        "3. Assess assumptions, edge cases, and failure modes.",
        "4. Recommend improvements or clarifications ahead of execution.",
        "5. Summarize the review findings and next review actions.",
      );
      break;
    case "tester":
      planLines.push(
        "1. Define the expected behavior and acceptance criteria for the task.",
        "2. Identify test cases, edge cases, and validation scenarios.",
        "3. Choose the correct testing approach for the scope (manual, unit, integration).",
        "4. Prepare a test execution plan and success criteria.",
        "5. Summarize the verification plan and any remaining uncertainties.",
      );
      break;
    case "planner":
      planLines.push(
        "1. Break the task into discrete work stages and order them logically.",
        "2. Identify dependencies and any required clarifications.",
        "3. Define milestones, deliverables, and success criteria.",
        "4. Recommend a review or validation checkpoint before completion.",
        "5. Suggest the next immediate steps to keep momentum.",
      );
      break;
    case "assistant":
      planLines.push(
        "1. Clarify what the task is asking and what success looks like.",
        "2. Identify the most important elements to address first.",
        "3. Outline the steps needed to fulfill the request safely.",
        "4. Highlight any assumptions and potential follow-up questions.",
        "5. Provide a concise recommendation for the next action.",
      );
      break;
    default:
      planLines.push(
        "1. Clarify the request and what local workspace information is available.",
        "2. Outline a safe planning approach based on the current task.",
        "3. Break the work into manageable steps.",
        "4. Note any assumptions and validation points.",
        "5. Summarize the next actions to keep the plan moving forward.",
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
    const { agentId, task } = parseAgentRequest(request);
    const answer = buildAgentResponse(agentId, task);
    yield { type: "message-start", messageId, model: request.model || model.id };
    for (const delta of answer.split(/(\s+)/)) {
      if (request.signal?.aborted) {
        yield { type: "error", messageId, error: { providerId: this.id, code: "aborted", message: "Generation was stopped.", retryable: false } };
        return;
      }
      await sleep(12);
      yield { type: "text-delta", messageId, delta };
    }
    yield { type: "done", messageId, finishReason: "stop" };
  }
}
