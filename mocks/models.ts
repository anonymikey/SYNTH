import type { ModelInfo } from "@/lib/ai/types";

export const mockModels: ModelInfo[] = [
  { id: "llama3.1:8b", label: "Llama 3.1 8B", providerId: "ollama", contextWindow: 128000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true } },
  { id: "synth-demo", label: "SYNTH Demo Model", providerId: "mock", contextWindow: 32000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true } },
];
