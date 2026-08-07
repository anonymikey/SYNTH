import { Badge } from "@/components/ui/badge";
import type { ProviderHealth } from "@/lib/ai/types";

export function ProviderStatus({ health }: { health: ProviderHealth }) {
  return <Badge variant="outline" className={health.status === "connected" ? "text-synth-success" : "text-muted-foreground"}>{health.providerId} · {health.status}</Badge>;
}
