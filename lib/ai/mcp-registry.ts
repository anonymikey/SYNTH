import type { ToolDefinition } from "@/tools/types";

export interface MCPServer {
  id: string;
  label: string;
  enabled: boolean;
  tools: ToolDefinition[];
}

const calculatorTool: ToolDefinition = {
  id: "calculator",
  label: "Calculator",
  category: "search",
  requiresApproval: false,
  enabled: true,
  inputSchema: { expression: "string (e.g. '45 * 27')" },
};

const workspaceInfoTool: ToolDefinition = {
  id: "workspace_info",
  label: "Workspace Info",
  category: "documentation",
  requiresApproval: false,
  enabled: true,
  inputSchema: {},
};

const searchDemoTool: ToolDefinition = {
  id: "search_demo",
  label: "Search Demo",
  category: "search",
  requiresApproval: false,
  enabled: true,
  inputSchema: { query: "string" },
};

const localServer: MCPServer = {
  id: "local-mcp",
  label: "Local Demo MCP",
  enabled: true,
  tools: [calculatorTool, workspaceInfoTool, searchDemoTool],
};

const servers: MCPServer[] = [localServer];

export const MCPRegistry = {
  listServers(): MCPServer[] {
    return [...servers];
  },
  getServer(id: string) {
    return servers.find((s) => s.id === id);
  },
  listTools(serverId?: string) {
    const server = serverId ? servers.find((s) => s.id === serverId) : servers[0];
    return server ? [...server.tools] : [];
  },
  findTool(toolId: string, serverId?: string) {
    const tools = this.listTools(serverId);
    return tools.find((t) => t.id === toolId);
  },
};
