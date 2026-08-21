"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelInfo, ProviderHealth } from "@/lib/ai/types";
import { configuredModels } from "@/lib/ai/models";

export interface ModelCatalogState {
  models: ModelInfo[];
  providerHealth: ProviderHealth[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useModelCatalog(): ModelCatalogState {
  const [models, setModels] = useState<ModelInfo[]>(configuredModels);
  const [providerHealth, setProviderHealth] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [modelsRes, healthRes] = await Promise.all([
        fetch("/api/ai/models"),
        fetch("/api/ai/health"),
      ]);

      if (modelsRes.ok) {
        const data = await modelsRes.json();
        const serverModels: ModelInfo[] = data.models ?? [];
        if (serverModels.length > 0) {
          // Merge: server models take precedence, fall back to configured
          const byId = new Map(serverModels.map((m: ModelInfo) => [m.id, m]));
          for (const m of configuredModels) {
            if (!byId.has(m.id)) byId.set(m.id, m);
          }
          setModels(Array.from(byId.values()));
        }
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setProviderHealth(data.providers ?? []);
      }
    } catch {
      // Network error — keep using configured models as fallback
      setError("Could not reach SYNTH server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, providerHealth, loading, error, refetch: fetchModels };
}

/** Group models into routing presets and actual model entries */
export function groupModels(models: ModelInfo[], providerHealth: ProviderHealth[]) {
  const available = models.filter((m) => m.enabled !== false);
  const openrouterStatus = providerHealth.find((p) => p.providerId === "openrouter");
  const isProviderConnected = openrouterStatus?.status === "connected";

  const routing = [
    { id: "auto", label: "Auto", description: "Best available model", available: isProviderConnected },
    { id: "free", label: "Free", description: "Free-tier models", available: available.some((m) => m.free) },
    { id: "coding", label: "Coding", description: "Code-optimized models", available: available.some((m) => m.category === "coding") },
    { id: "reasoning", label: "Reasoning", description: "Reasoning-optimized", available: available.some((m) => m.category === "reasoning") },
    { id: "vision", label: "Vision", description: "Image-capable models", available: available.some((m) => m.category === "vision") },
  ];

  const groupedModels = available.map((m) => ({
    ...m,
    available: isProviderConnected || m.providerId === "mock",
  }));

  return { routing, models: groupedModels };
}
