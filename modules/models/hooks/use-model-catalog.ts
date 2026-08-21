"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProviderHealth } from "@/lib/ai/types";

/** Public SYNTH model profile (matches /api/ai/models response) */
export interface SynthModelView {
  id: string;
  label: string;
  category: string;
  free: boolean;
  available: boolean;
}

/** Routing preset from the server */
export interface SynthRoutingPreset {
  id: string;
  label: string;
  description: string;
  available: boolean;
}

export interface ModelCatalogState {
  models: SynthModelView[];
  routing: SynthRoutingPreset[];
  providerHealth: ProviderHealth[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useModelCatalog(): ModelCatalogState {
  const [models, setModels] = useState<SynthModelView[]>([]);
  const [routing, setRouting] = useState<SynthRoutingPreset[]>([]);
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
        setModels(data.models ?? []);
        setRouting(data.routing ?? []);
      }

      if (healthRes.ok) {
        const data = await healthRes.json();
        setProviderHealth(data.providers ?? []);
      }
    } catch {
      setError("Could not reach SYNTH server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return { models, routing, providerHealth, loading, error, refetch: fetchModels };
}
