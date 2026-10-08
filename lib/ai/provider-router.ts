import type { AIProvider, ProviderId, ProviderSelection } from "@/lib/ai/types";
import type { ProviderPort } from "@/engine/ports";
import type { ProviderRegistry } from "@/lib/ai/provider-registry";
import { resolveConfiguredModel } from "@/lib/ai/models";

export class ProviderRouter implements ProviderPort {
  constructor(private readonly registry: ProviderRegistry) {}

  async resolve(selection: ProviderSelection): Promise<AIProvider> {
    if (selection.providerId === "openrouter" && !resolveConfiguredModel(selection.model)) {
      throw new Error(`OpenRouter model '${selection.model}' is not configured.`);
    }
    const provider = this.registry.get(selection.providerId);
    if (provider) {
      const health = await provider.healthCheck();
      if (health.status === "connected" || !selection.allowFallback) return provider;
    }

    if (selection.allowFallback) {
      const candidates: ProviderId[] = (["openrouter", "openai", "gemini"] as ProviderId[]).filter((id) => id !== selection.providerId);
      for (const id of candidates) {
        const candidate = this.registry.get(id);
        if (candidate && (await candidate.healthCheck()).status === "connected") return candidate;
      }
      const demo = this.registry.get("mock");
      if (demo) return demo;
    }

    throw new Error(`Provider ${selection.providerId} is not configured.`);
  }
}
