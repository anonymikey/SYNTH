import type { ProviderId, ProviderSelection } from "@/lib/ai/types";

/**
 * SYNTH Model Profile — the public-facing identity for a model.
 * Users see these names; providers and internal IDs stay server-side.
 */
export interface SynthModelProfile {
  /** Public SYNTH model ID (sent by browser) */
  id: string;
  /** User-facing display name */
  label: string;
  /** Category for UI grouping */
  category: "general" | "coding" | "reasoning" | "vision" | "fast" | "local" | "demo";
  /** Whether this model is available right now (resolved at runtime) */
  available: boolean;
  /** Whether this is a free-tier model */
  free: boolean;
  /** Internal provider + model mapping (server-only, never sent to browser) */
  internal: {
    providerId: ProviderId;
    model: string;
    allowFallback: boolean;
  };
}

/**
 * SYNTH Model Catalog — the product abstraction layer.
 * Maps SYNTH public IDs to internal provider/model selections.
 *
 * Internal provider IDs and model strings are NEVER exposed to the browser.
 * The browser only sees synth-* IDs and human-readable labels.
 */
export const SYNTH_MODEL_CATALOG: SynthModelProfile[] = [
  {
    id: "synth-ultra",
    label: "SYNTH Ultra",
    category: "general",
    available: true,
    free: false,
    internal: { providerId: "openrouter", model: "openai/gpt-4o-mini", allowFallback: true },
  },
  {
    id: "synth-code",
    label: "SYNTH Code",
    category: "coding",
    available: true,
    free: true,
    internal: { providerId: "openrouter", model: "stealth/ox-alpha", allowFallback: true },
  },
  {
    id: "synth-reason",
    label: "SYNTH Reason",
    category: "reasoning",
    available: true,
    free: true,
    internal: { providerId: "openrouter", model: "deepseek/deepseek-r1:free", allowFallback: true },
  },
  {
    id: "synth-vision",
    label: "SYNTH Vision",
    category: "vision",
    available: true,
    free: false,
    internal: { providerId: "openrouter", model: "google/gemini-2.0-flash-001", allowFallback: true },
  },
  {
    id: "synth-fast",
    label: "SYNTH Fast",
    category: "fast",
    available: true,
    free: false,
    internal: { providerId: "openrouter", model: "openai/gpt-4o-mini", allowFallback: true },
  },
  {
    id: "synth-local",
    label: "SYNTH Local",
    category: "local",
    available: true,
    free: true,
    internal: { providerId: "ollama", model: "llama3.1:8b", allowFallback: false },
  },
  {
    id: "synth-demo",
    label: "SYNTH Demo",
    category: "demo",
    available: true,
    free: true,
    internal: { providerId: "mock", model: "synth-demo", allowFallback: false },
  },
];

/** Routing presets that users see in the model selector */
export const SYNTH_ROUTING_PRESETS = [
  { id: "auto", label: "Auto", description: "Best available model", available: true },
  { id: "free", label: "Free", description: "Free-tier models", available: true },
  { id: "coding", label: "Coding", description: "Code-optimized models", available: true },
  { id: "reasoning", label: "Reasoning", description: "Reasoning-optimized", available: true },
  { id: "vision", label: "Vision", description: "Image-capable models", available: true },
] as const;

/** Get a SYNTH model profile by its public ID */
export function getSynthModel(id: string): SynthModelProfile | undefined {
  return SYNTH_MODEL_CATALOG.find((m) => m.id === id);
}

/**
 * Resolve a SYNTH model ID into a server-side ProviderSelection.
 * Handles:
 *   - Explicit SYNTH model IDs (synth-ultra, synth-code, etc.)
 *   - Routing presets (auto, free, coding, reasoning, vision)
 *   - Legacy raw provider model IDs (backward compat, normalized server-side)
 *
 * Throws on unknown/invalid model IDs.
 */
export function resolveSynthModel(modelId: string): ProviderSelection {
  // 1. Direct SYNTH model match
  const profile = getSynthModel(modelId);
  if (profile) {
    return {
      providerId: profile.internal.providerId,
      model: profile.internal.model,
      allowFallback: profile.internal.allowFallback,
    };
  }

  // 2. Routing presets — resolve to the best matching SYNTH model
  if (modelId === "auto") {
    return { providerId: "openrouter", model: "openai/gpt-4o-mini", allowFallback: true };
  }
  if (modelId === "free") {
    const freeModel = SYNTH_MODEL_CATALOG.find((m) => m.free && m.available);
    if (freeModel) return { providerId: freeModel.internal.providerId, model: freeModel.internal.model, allowFallback: true };
    return { providerId: "mock", model: "synth-demo", allowFallback: false };
  }
  if (modelId === "coding") {
    const codingModel = SYNTH_MODEL_CATALOG.find((m) => m.category === "coding" && m.available);
    if (codingModel) return { providerId: codingModel.internal.providerId, model: codingModel.internal.model, allowFallback: true };
  }
  if (modelId === "reasoning") {
    const reasoningModel = SYNTH_MODEL_CATALOG.find((m) => m.category === "reasoning" && m.available);
    if (reasoningModel) return { providerId: reasoningModel.internal.providerId, model: reasoningModel.internal.model, allowFallback: true };
  }
  if (modelId === "vision") {
    const visionModel = SYNTH_MODEL_CATALOG.find((m) => m.category === "vision" && m.available);
    if (visionModel) return { providerId: visionModel.internal.providerId, model: visionModel.internal.model, allowFallback: true };
  }

  // 3. Legacy fallback: raw provider model IDs from old clients.
  // Normalize known internal model IDs into their SYNTH profile equivalents.
  // This preserves backward compatibility without exposing internals.
  const legacyMap: Record<string, ProviderSelection> = {
    "openai/gpt-4o-mini": { providerId: "openrouter", model: "openai/gpt-4o-mini", allowFallback: true },
    "qwen/qwen3-30b-a3b:free": { providerId: "openrouter", model: "qwen/qwen3-30b-a3b:free", allowFallback: true },
    "stealth/ox-alpha": { providerId: "openrouter", model: "stealth/ox-alpha", allowFallback: true },
    "deepseek/deepseek-r1:free": { providerId: "openrouter", model: "deepseek/deepseek-r1:free", allowFallback: true },
    "google/gemini-2.0-flash-001": { providerId: "openrouter", model: "google/gemini-2.0-flash-001", allowFallback: true },
    "llama3.1:8b": { providerId: "ollama", model: "llama3.1:8b", allowFallback: false },
    "synth-demo": { providerId: "mock", model: "synth-demo", allowFallback: false },
  };

  if (legacyMap[modelId]) return legacyMap[modelId];

  throw new Error(`Unknown SYNTH model: "${modelId}". Valid models: ${SYNTH_MODEL_CATALOG.map((m) => m.id).join(", ")}`);
}

/** Get the public SYNTH display label for a model ID (for UI use) */
export function getSynthModelLabel(modelId: string): string {
  const profile = getSynthModel(modelId);
  if (profile) return profile.label;
  // Routing presets
  const preset = SYNTH_ROUTING_PRESETS.find((r) => r.id === modelId);
  if (preset) return preset.label;
  // Reverse lookup: raw provider model ID → SYNTH label
  // This handles cases where the health endpoint returns raw model names
  // like "openai/gpt-4o-mini" instead of the SYNTH public ID.
  const reverseMatch = SYNTH_MODEL_CATALOG.find((m) => m.internal.model === modelId);
  if (reverseMatch) return reverseMatch.label;
  return modelId;
}
