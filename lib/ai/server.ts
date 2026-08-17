import { createKnowledgeService } from "@/knowledge/knowledge-service";
import { createMemoryService } from "@/memory/memory-service";
import { serverEnvironment } from "@/lib/config/environment";
import { createProviderRegistry } from "@/lib/ai/provider-registry";
import { ProviderRouter } from "@/lib/ai/provider-router";
import { MockProvider } from "@/lib/ai/providers/mock-provider";
import { OllamaProvider } from "@/lib/ai/providers/ollama-provider";
import { createSynthEngine } from "@/engine/synth-engine";
import { synthAgentPort } from "@/agents/default-port";
import { mockMcpToolPort } from "@/lib/ai/mock-mcp";

const ollama = new OllamaProvider(serverEnvironment.ollamaBaseUrl, serverEnvironment.ollamaModel);
const mock = new MockProvider();
const registry = createProviderRegistry([ollama, mock]);
const router = new ProviderRouter(registry);
const memory = createMemoryService();
const knowledge = createKnowledgeService();

export const serverAi = { ollama, mock, registry, router };

export function getSynthEngine() {
  return createSynthEngine({ provider: router, memory, knowledge, agents: synthAgentPort, tools: mockMcpToolPort, defaultSelection: { providerId: "ollama", model: serverEnvironment.ollamaModel, allowFallback: true } });
}
