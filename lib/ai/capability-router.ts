import type {
  CapabilityIntentInput,
  CapabilityIntentResult,
  SynthHandoff,
  SynthRecommendation,
} from "@/lib/handoff/types";

/* ------------------------------------------------------------------ */
/*  Pattern Matchers                                                  */
/* ------------------------------------------------------------------ */

const IMAGE_GENERATION_PATTERNS = [
  /\b(?:generate|create|render|draw|make|design)\b.*\b(?:image|picture|logo|avatar|graphic|artwork|visual|wallpaper|illustration|icon)\b/i,
  /\b(?:generate|create)\b.*\b(?:futuristic|photorealistic|cyberpunk|minimalist|stylized)\b.*\b(?:logo|mark|concept|graphic|version)\b/i,
  /\bcreate a futuristic version of\b/i,
  /\bgenerate a logo\b/i,
  /\bmake this futuristic\b/i,
  /\bmake an image of\b/i,
  /\bdraw me a\b/i,
];

const MULTI_AGENT_PATTERNS = [
  /\b(?:analyze|plan).*\b(?:implement|code).*\b(?:review|security).*\b(?:test)\b/i,
  /\b(?:architect|architecture).*\b(?:implement|execute).*\b(?:review).*\b(?:test)\b/i,
  /\b(?:multi-?agent|agent team|team of agents|orchestrat(?:e|ion))\b/i,
  /\b(?:break down|decompose).*\b(?:delegate|coordinate).*\b(?:across agents|specialists)\b/i,
  /\banalyze the architecture, implement the solution, review security and test everything\b/i,
];

const WEBSITE_BUILD_PATTERNS = [
  /\b(?:build|create|scaffold|develop|make)\b.*\b(?:e-?commerce|portfolio|landing page|storefront|blog)\b.*\b(?:website|site|webpage)\b/i,
  /\b(?:build|create|make)\s+(?:me\s+)?(?:an?\s+)?(?:e-?commerce\s+)?website\b/i,
  /\b(?:build|create)\s+(?:a\s+)?web\s*site\b/i,
];

const APPLICATION_BUILD_PATTERNS = [
  /\b(?:build|create|scaffold|develop|make)\b.*\b(?:saas|dashboard|crm|portal|web\s*app|application|platform|system)\b/i,
  /\b(?:build|create|make)\s+(?:this\s+)?dashboard\b/i,
  /\b(?:build|create)\s+(?:a\s+)?saas\b/i,
  /\b(?:build|create)\s+(?:an?\s+)?(?:full\s*stack\s+)?application\b/i,
  /\b(?:build|create)\s+(?:a\s+)?system\b/i,
];

const BUG_FIX_PATTERNS = [
  /\b(?:fix|debug|resolve|patch|repair)\b.*\b(?:bug|issue|error|exception|crash|failure|problem|broken|typo|leak)\b/i,
  /\bfix this\b/i,
  /\bdebug this\b/i,
  /\bfix (?:the|this) (?:authentication|auth|login|signup|api|hydration) bug\b/i,
];

const REFACTOR_PATTERNS = [
  /\b(?:refactor|clean up|restructure|optimize|modernize|simplify)\b.*\b(?:code|function|component|module|file|class|service)\b/i,
  /\brefactor this\b/i,
];

const CODE_REVIEW_PATTERNS = [
  /\b(?:review|audit|critique|inspect)\b.*\b(?:code|pr|pull request|diff|implementation|snippet)\b/i,
  /\breview this code\b/i,
  /\bcode review\b/i,
];

const IMAGE_ANALYSIS_PATTERNS = [
  /\b(?:what do you see|describe what you see|explain this image|analyze this image|what is this image)\b/i,
  /\b(?:describe|inspect|examine|read|extract)\b.*\b(?:image|screenshot|photo|diagram|mockup)\b/i,
  /\bwhat is in this\b/i,
];

const CAPABILITY_QUESTIONS = [
  /\b(?:what can synth do|what does synth do|how does synth work|what are synth(?:'s)? capabilities)\b/i,
  /\b(?:can synth|is synth able to)\b.*\b(?:build|generate|code|analyze|do)\b/i,
  /\b(?:what is synth|who is synth|tell me about synth)\b/i,
];

const RESEARCH_PATTERNS = [
  /\b(?:run a search|search for|search the web|research|find docs|look up)\b/i,
];

/* ------------------------------------------------------------------ */
/*  Main Capability Router                                             */
/* ------------------------------------------------------------------ */

export function detectCapabilityIntent(input: CapabilityIntentInput): CapabilityIntentResult {
  const text = input.userMessage.trim();
  const lower = text.toLowerCase();
  const attachments = input.attachments ?? [];
  const imageAttachments = attachments.filter((a) => a.kind === "image" || a.mimeType?.startsWith("image/"));
  const hasImages = imageAttachments.length > 0;
  const projectName = input.project?.name ?? "active project";
  const selectedFile = input.selectedFile;

  // 1. COMPOUND: Image Attachment + Build / Code Intent
  if (hasImages && (APPLICATION_BUILD_PATTERNS.some((p) => p.test(lower)) || WEBSITE_BUILD_PATTERNS.some((p) => p.test(lower)) || /\b(?:build|code|implement|turn into code|recreate)\b/i.test(lower))) {
    return {
      intent: "application_building",
      destination: "code",
      confidence: 0.95,
      needsHandoff: true,
      title: "SYNTH Code + Forge",
      description: "This is a development task with visual context. SYNTH Code and Forge can inspect your screenshot, project files, and generate the implementation.",
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Image attachment detected", "Development / build intent detected in prompt"],
      assistantResponseHint: "This is a development task with visual reference. SYNTH Code + Forge is the dedicated workspace where you can turn designs into live components with full file access.",
    };
  }

  // 2. COMPOUND: Image Attachment + Image Generation Intent
  if (hasImages && (IMAGE_GENERATION_PATTERNS.some((p) => p.test(lower)) || /\b(?:futuristic|redesign|remix|generate|style|re-imagine)\b/i.test(lower))) {
    return {
      intent: "image_generation",
      destination: "vision",
      confidence: 0.95,
      needsHandoff: true,
      title: "SYNTH Vision",
      description: "This is an image-generation and transformation task. SYNTH Vision is built specifically for reference-guided visual generation.",
      actionLabel: "Open in SYNTH Vision",
      suggestedTask: text,
      reasons: ["Image attachment detected", "Image-generation / transformation prompt detected"],
      assistantResponseHint: "This is an image-generation workflow. SYNTH Vision is designed to stage reference assets, configure aspect ratios, and generate high-fidelity product imagery.",
    };
  }

  // 3. Image Attachment or Image Understanding / Analysis
  if (hasImages || IMAGE_ANALYSIS_PATTERNS.some((p) => p.test(lower))) {
    const wantsCodeAssistance = /\b(?:how (?:can|would|to) (?:i )?build|how to recreate|code this|implement this)\b/i.test(lower);
    if (wantsCodeAssistance) {
      return {
        intent: "image_analysis",
        destination: "code",
        confidence: 0.88,
        needsHandoff: true,
        title: "SYNTH Code",
        description: "Image analysis shows UI design intent. You can examine it here or continue directly in SYNTH Code + Forge.",
        actionLabel: "Continue in SYNTH Code",
        suggestedTask: text,
        reasons: ["Image attachment detected", "UI breakdown + code recreation requested"],
      };
    }

    return {
      intent: "image_analysis",
      destination: "assistant",
      confidence: 0.9,
      needsHandoff: false,
      title: "Multimodal Analysis",
      description: "SYNTH Assistant will analyze the attached visual asset directly.",
      actionLabel: "View Analysis",
      suggestedTask: text,
      reasons: ["Image attachment detected", "Pure image understanding request"],
    };
  }

  // 4. Text-Only Image Generation Intent
  if (IMAGE_GENERATION_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "image_generation",
      destination: "vision",
      confidence: 0.94,
      needsHandoff: true,
      title: "SYNTH Vision",
      description: "This is an image-generation task. SYNTH Vision is built for this workflow.",
      actionLabel: "Open in SYNTH Vision",
      suggestedTask: text,
      reasons: ["Image generation keywords detected in user prompt"],
      assistantResponseHint: "This is an image-generation task. SYNTH Vision is built specifically for creating visual assets, mockups, and logos.",
    };
  }

  // 5. Multi-Agent Workflow Intent
  if (MULTI_AGENT_PATTERNS.some((p) => p.test(lower))) {
    const sequence = ["Architect", "Forge", "Security", "Reviewer", "Testing"];
    return {
      intent: "multi_agent_task",
      destination: "agent",
      confidence: 0.93,
      needsHandoff: true,
      title: "SYNTH Agent Workflow",
      description: "This task needs multiple specialists to coordinate sequentially.",
      actionLabel: "Start Agent Workflow",
      suggestedTask: text,
      agentSequence: sequence,
      reasons: ["Multi-phase engineering workflow detected (analysis, implementation, security, testing)"],
      assistantResponseHint: "This task benefits from a coordinated sequence of SYNTH specialist agents across architecture, implementation, security auditing, and automated verification.",
    };
  }

  // 6. Website Building Intent
  if (WEBSITE_BUILD_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "website_building",
      destination: "code",
      confidence: 0.92,
      needsHandoff: true,
      title: "SYNTH Code",
      description: "This is a development task. SYNTH Code + Forge can scaffold your project structure, edit source files, and live-preview pages.",
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Website development intent detected"],
      assistantResponseHint: "Building a website is a full engineering task. SYNTH Code + Forge provides the IDE workspace, project file tree, and preview pane to build and inspect it live.",
    };
  }

  // 7. Application / System Building Intent
  if (APPLICATION_BUILD_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "application_building",
      destination: "code",
      confidence: 0.91,
      needsHandoff: true,
      title: "SYNTH Code",
      description: "This is a development task. SYNTH Code + Forge can work directly with your project, files, and code.",
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Application / dashboard / system building intent detected"],
      assistantResponseHint: "This is a full development task. SYNTH Code + Forge can work directly with your project files, dependencies, and architecture.",
    };
  }

  // 8. Bug Fixing Intent (with project context)
  if (BUG_FIX_PATTERNS.some((p) => p.test(lower))) {
    const contextNote = selectedFile
      ? `targeting ${selectedFile}`
      : input.project
      ? `in project "${projectName}"`
      : "";
    return {
      intent: "bug_fixing",
      destination: "code",
      confidence: 0.89,
      needsHandoff: true,
      title: "SYNTH Code",
      description: `This is a targeted code diagnosis and fix task ${contextNote}. SYNTH Code can inspect the code tree and propose precise diffs.`,
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Bug fixing / troubleshooting intent detected"],
      assistantResponseHint: "Debugging and fixing code is best handled inside SYNTH Code, where the engine has direct access to your repository files and syntax diagnostics.",
    };
  }

  // 9. Code Review Intent
  if (CODE_REVIEW_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "code_review",
      destination: "code",
      confidence: 0.88,
      needsHandoff: true,
      title: "SYNTH Code / Reviewer",
      description: "This is a code review task. SYNTH Code provides diff views and review checkpoints.",
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Code review request detected"],
      assistantResponseHint: "Code review is supported in SYNTH Code with side-by-side diffing, line annotations, and security review checks.",
    };
  }

  // 10. Refactoring Intent
  if (REFACTOR_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "refactoring",
      destination: "code",
      confidence: 0.88,
      needsHandoff: true,
      title: "SYNTH Code",
      description: "Refactoring code requires workspace file context and proposal diffs in Forge.",
      actionLabel: "Open in SYNTH Code",
      suggestedTask: text,
      reasons: ["Code refactoring intent detected"],
      assistantResponseHint: "Refactoring is best executed in SYNTH Code, allowing you to review proposed code changes before applying them.",
    };
  }

  // 11. Research and Search Intent
  if (RESEARCH_PATTERNS.some((p) => p.test(lower))) {
    return {
      intent: "research",
      destination: "search",
      confidence: 0.9,
      needsHandoff: false,
      title: "SYNTH Search & Research",
      description: "Information gathering, web search, or documentation query.",
      actionLabel: "Search in SYNTH",
      suggestedTask: text,
      reasons: ["Search / research intent keywords detected"],
    };
  }

  // 12. Capability Discovery Questions
  if (CAPABILITY_QUESTIONS.some((p) => p.test(lower))) {
    return {
      intent: "capability_question",
      destination: "assistant",
      confidence: 0.96,
      needsHandoff: false,
      title: "SYNTH Platform Overview",
      description: "SYNTH is a modular local-first AI workspace featuring Assistant, Code, Vision, Specialist Agents, and Integrations.",
      actionLabel: "Explore SYNTH",
      suggestedTask: text,
      reasons: ["Platform capability inquiry detected"],
    };
  }

  // 12. General Chat / Research / Questions (Default)
  return {
    intent: "general_chat",
    destination: "assistant",
    confidence: 0.8,
    needsHandoff: false,
    title: "SYNTH Assistant",
    description: "General question handled directly in the Assistant workspace.",
    actionLabel: "Continue in Assistant",
    suggestedTask: text,
    reasons: ["General conversation or factual inquiry"],
  };
}

/* ------------------------------------------------------------------ */
/*  Helper: Build SynthRecommendation                                  */
/* ------------------------------------------------------------------ */

export function createRecommendationFromIntent(
  result: CapabilityIntentResult,
  input: CapabilityIntentInput
): SynthRecommendation | null {
  if (!result.needsHandoff) return null;

  const handoff: SynthHandoff = {
    id: crypto.randomUUID(),
    source: "assistant",
    destination: result.destination,
    intent: result.intent,
    userRequest: input.userMessage,
    suggestedTask: result.suggestedTask,
    attachments: input.attachments ?? [],
    projectId: input.project?.id,
    projectName: input.project?.name,
    selectedFile: input.selectedFile ?? undefined,
    conversationContext: input.conversationContext,
    agentSequence: result.agentSequence,
    createdAt: new Date().toISOString(),
  };

  return {
    id: crypto.randomUUID(),
    destination: result.destination,
    intent: result.intent,
    title: result.title,
    description: result.description,
    badge: result.destination === "vision"
      ? "Image Workflow"
      : result.destination === "code"
      ? "Development"
      : result.destination === "agent"
      ? "Multi-Agent"
      : undefined,
    actionLabel: result.actionLabel,
    handoff,
    agentSequence: result.agentSequence,
  };
}

/* ------------------------------------------------------------------ */
/*  Concise Platform Capability Answer (for Test 10)                  */
/* ------------------------------------------------------------------ */

export const SYNTH_CAPABILITIES_OVERVIEW = `
**SYNTH** is a unified, local-first AI development workspace designed to handle your entire workflow from conception to deployment:

- **SYNTH Assistant** — The intelligent concierge for research, architectural planning, conceptual questions, and multimodal analysis.
- **SYNTH Code + Forge** — Full IDE with project file tree, live preview, syntax highlighting, and Forge for staged code generation and refactoring diffs.
- **SYNTH Vision** — Image intelligence for visual mockups, logo generation, and reference-guided asset design.
- **Specialist Agents** — A curated registry of role-based agents (Architect, Coder, Reviewer, Tester, Security, and Planner) for structured, safe multi-agent execution.
- **Project & GitHub Context** — Native repository adapters that preserve branches, files, and workspace context without leaking credentials.
- **Integrations & MCP** — Controlled tools, documentation retrieval, and Model Context Protocol connections governed by strict ToolPolicy.
`.trim();
