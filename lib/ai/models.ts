import type { ModelInfo } from "@/lib/ai/types";

const openRouterCapabilities = { streaming: true, vision: false, tools: false, embeddings: false, jsonMode: true, local: false } as const;

export const configuredModels: ModelInfo[] = [
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", providerId: "openrouter", contextWindow: 128000, capabilities: openRouterCapabilities, category: "chat", enabled: true, free: false, priority: 100 },
  { id: "qwen/qwen3-30b-a3b:free", label: "Qwen 3 30B · Free", providerId: "openrouter", contextWindow: 32768, capabilities: openRouterCapabilities, category: "coding", enabled: true, free: true, priority: 80 },
  { id: "deepseek/deepseek-r1:free", label: "DeepSeek R1 · Free", providerId: "openrouter", contextWindow: 65536, capabilities: openRouterCapabilities, category: "reasoning", enabled: true, free: true, priority: 70 },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", providerId: "openrouter", contextWindow: 1000000, capabilities: { ...openRouterCapabilities, vision: true }, category: "vision", enabled: true, free: false, priority: 60 },
];

export const modelPreferences = ["auto", "free", "coding", "reasoning", "vision"] as const;
export type ModelPreference = (typeof modelPreferences)[number];

export function getConfiguredModel(modelId: string): ModelInfo | undefined {
  return configuredModels.find((model) => model.enabled !== false && model.id === modelId);
}

export function resolveConfiguredModel(preference: string): ModelInfo | undefined {
  const explicit = getConfiguredModel(preference);
  if (explicit) return explicit;
  const candidates = configuredModels.filter((model) => model.enabled !== false && (preference === "free" ? model.free === true : preference === "auto" || model.category === preference));
  return [...candidates].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0))[0];
}