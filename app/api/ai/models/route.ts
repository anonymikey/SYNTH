import { NextResponse } from "next/server";
import { serverAi } from "@/lib/ai/server";
import { SYNTH_MODEL_CATALOG, SYNTH_ROUTING_PRESETS } from "@/lib/ai/synth-models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Check provider health to determine availability
  const healthChecks = await Promise.all(
    serverAi.registry.list().map((provider) => provider.healthCheck())
  );

  const openrouterConnected = healthChecks.some(
    (h) => h.providerId === "openrouter" && h.status === "connected"
  );
  const ollamaConnected = healthChecks.some(
    (h) => h.providerId === "ollama" && h.status === "connected"
  );

  // Map SYNTH profiles to public response, updating availability based on live health
  const models = SYNTH_MODEL_CATALOG.map((profile) => ({
    id: profile.id,
    label: profile.label,
    category: profile.category,
    free: profile.free,
    // Resolve availability: openrouter models need openrouter connected,
    // ollama models need ollama connected, mock is always available
    available:
      profile.internal.providerId === "mock"
        ? true
        : profile.internal.providerId === "ollama"
          ? ollamaConnected
          : openrouterConnected,
  }));

  return NextResponse.json({
    routing: SYNTH_ROUTING_PRESETS,
    models,
  });
}
