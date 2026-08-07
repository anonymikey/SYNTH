import type { AIProvider, ProviderId } from "@/lib/ai/types";

export interface ProviderRegistry {
  get(providerId: ProviderId): AIProvider | undefined;
  has(providerId: ProviderId): boolean;
  list(): AIProvider[];
}

export function createProviderRegistry(providers: AIProvider[]): ProviderRegistry {
  const map = new Map(providers.map((provider) => [provider.id, provider]));
  return {
    get: (providerId) => map.get(providerId),
    has: (providerId) => map.has(providerId),
    list: () => [...map.values()],
  };
}
