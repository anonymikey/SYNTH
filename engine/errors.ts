export type EngineErrorCode = "invalid-request" | "authorization" | "routing" | "context" | "provider" | "tool" | "aborted" | "unknown";

export interface EngineError {
  code: EngineErrorCode;
  message: string;
  retryable: boolean;
  cause?: unknown;
}

export function createEngineError(code: EngineErrorCode, message: string, options: { retryable?: boolean; cause?: unknown } = {}): EngineError {
  return { code, message, retryable: options.retryable ?? false, cause: options.cause };
}
