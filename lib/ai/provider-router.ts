import type { AIProvider, ProviderSelection } from "@/lib/ai/types";
import type { ProviderPort } from "@/engine/ports";
import type { ProviderRegistry } from "@/lib/ai/provider-registry";

export class ProviderRouter implements ProviderPort {
  constructor(private readonly registry: ProviderRegistry) {}

  async resolve(selection: ProviderSelection): Promise<AIProvider> {
    const provider = this.registry.get(selection.providerId);
    if (provider) {
      const health = await provider.healthCheck();
      if (health.status === "connected" || !selection.allowFallback) return provider;
    }

    if (selection.allowFallback) {
      const fallback = this.registry.get("mock");
      if (fallback) return fallback;
    }

    throw new Error(`Provider ${selection.providerId} is not configured.`);
  }
}
