export type SynthModuleId = "assistant" | "code" | "agent" | "docs" | "search" | "vision";

export interface ModuleDefinition {
  id: SynthModuleId;
  label: string;
  description: string;
  icon: string;
  status: "active" | "planned" | "coming-soon";
}

export const SYNTH_MODULES: ModuleDefinition[] = [
  { id: "assistant", label: "SYNTH Assistant", description: "General AI workspace", icon: "message-circle-2", status: "active" },
  { id: "code", label: "SYNTH Code", description: "AI development environment for building and editing projects", icon: "code-2", status: "active" },
  { id: "agent", label: "SYNTH Agent", description: "Autonomous workflow execution", icon: "route", status: "planned" },
  { id: "docs", label: "SYNTH Docs", description: "Knowledge and documentation", icon: "book-open", status: "active" },
  { id: "search", label: "SYNTH Search", description: "Workspace and web search", icon: "search", status: "active" },
  { id: "vision", label: "SYNTH Vision", description: "Image intelligence and generation", icon: "image", status: "coming-soon" },
];

export const WORKSPACE_AREAS = [
  { id: "history", label: "Conversation History", icon: "history" },
  { id: "projects", label: "Projects", icon: "folders" },
  { id: "knowledge", label: "Knowledge", icon: "brain" },
  { id: "skills", label: "Skills", icon: "sparkles" },
  { id: "plugins", label: "Plugins", icon: "plug-zap" },
  { id: "imports", label: "Import Project", icon: "download" },
  { id: "mcp", label: "MCP Connections", icon: "network" },
  { id: "agents", label: "Agents", icon: "bot" },
  { id: "capabilities", label: "AI Capabilities", icon: "sparkles" },
] as const;
