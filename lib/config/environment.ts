function readOptional(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

export const serverEnvironment = {
  ollamaBaseUrl: readOptional("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
  ollamaModel: readOptional("OLLAMA_MODEL", "llama3.1:8b"),
  appUrl: readOptional("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
} as const;
