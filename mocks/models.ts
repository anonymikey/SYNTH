import type { ModelInfo } from "@/lib/ai/types";
import { configuredModels, modelPreferences } from "@/lib/ai/models";

export const mockModels: ModelInfo[] = [
  ...modelPreferences.map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), providerId: "openrouter" as const, capabilities: configuredModels[0].capabilities, enabled: true })),
  ...configuredModels,
  { id: "llama3.1:8b", label: "Llama 3.1 8B", providerId: "ollama", contextWindow: 128000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true }, enabled: true },
  { id: "synth-demo", label: "SYNTH Demo Model", providerId: "mock", contextWindow: 32000, capabilities: { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: true } },
];
