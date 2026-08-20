import { configuredModels, resolveConfiguredModel } from "./models";
import { OpenRouterProvider } from "./providers/openrouter-provider";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runOpenRouterProviderTests() {
  const provider = new OpenRouterProvider(undefined, "https://openrouter.ai/api/v1");
  assert((await provider.healthCheck()).status === "offline", "missing API key reports offline");
  assert((await provider.listModels()).length > 0, "fallback models remain available without an API key");
  assert(Boolean(resolveConfiguredModel("free")?.free), "free preference selects a configured free model");
  assert(resolveConfiguredModel("coding")?.category === "coding", "coding preference selects a coding model");
  assert(resolveConfiguredModel(configuredModels[0].id)?.id === configuredModels[0].id, "explicit model selection is validated");
  assert(resolveConfiguredModel("not-configured") === undefined, "unknown explicit models are rejected");
  console.log("OpenRouter provider tests passed.");
}

if (require.main === module) runOpenRouterProviderTests().catch((error) => { console.error(error); process.exit(1); });