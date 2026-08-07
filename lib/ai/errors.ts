import type { ProviderError, ProviderErrorCode, ProviderId } from "@/lib/ai/types";

export function createProviderError(
  providerId: ProviderId,
  code: ProviderErrorCode,
  message: string,
  options: { retryable?: boolean; cause?: unknown } = {},
): ProviderError {
  return {
    providerId,
    code,
    message,
    retryable: options.retryable ?? false,
    cause: options.cause,
  };
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
