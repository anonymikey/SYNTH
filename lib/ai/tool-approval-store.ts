import { randomUUID } from "crypto";
import type { ToolCall } from "@/tools/types";
import type { EngineIntent } from "@/engine/types";

export interface ToolApprovalRecord {
  token: string;
  requestId: string;
  agentId: string;
  intent?: EngineIntent;
  toolId: string;
  callId: string;
  input?: unknown;
  createdAt: number;
  expiresAt: number;
  consumedAt?: number;
  consumed?: boolean;
}

export interface ToolApprovalCreateArgs {
  requestId: string;
  agentId: string;
  intent?: EngineIntent;
  call: ToolCall;
  ttlMs?: number;
}

export interface ToolApprovalConsumeResult {
  ok: boolean;
  reason?: string;
  record?: ToolApprovalRecord;
}

export interface ToolApprovalStore {
  create(args: ToolApprovalCreateArgs): Promise<ToolApprovalRecord>;
  get(token: string): Promise<ToolApprovalRecord | undefined>;
  consume(token: string): Promise<ToolApprovalConsumeResult>;
  delete(token: string): Promise<void>;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export class InMemoryToolApprovalStore implements ToolApprovalStore {
  private map = new Map<string, ToolApprovalRecord>();

  /**
   * Create an approval record and return it. The returned record contains the opaque server-generated token
   * and the binding of requestId, agentId, intent, toolId and callId.
   *
   * Note for future persistent adapters (Redis): create() should ensure the token is stored atomically and
   * the token must be unique. Redis SETNX or equivalent should be used to avoid races when generating tokens
   * across processes.
   */
  async create(args: ToolApprovalCreateArgs): Promise<ToolApprovalRecord> {
    const token = randomUUID();
    const now = Date.now();
    const record: ToolApprovalRecord = {
      token,
      requestId: args.requestId,
      agentId: args.agentId,
      intent: args.intent,
      toolId: args.call.toolId,
      callId: args.call.id,
      input: args.call.input,
      createdAt: now,
      expiresAt: now + (args.ttlMs ?? DEFAULT_TTL_MS),
      consumed: false,
    };
    this.map.set(token, record);
    return record;
  }

  async get(token: string): Promise<ToolApprovalRecord | undefined> {
    const rec = this.map.get(token);
    if (!rec) return undefined;
    if (Date.now() > rec.expiresAt) return undefined;
    return { ...rec };
  }

  async consume(token: string): Promise<ToolApprovalConsumeResult> {
    const rec = this.map.get(token);
    if (!rec) return { ok: false, reason: "not_found_or_expired" };
    if (Date.now() > rec.expiresAt) return { ok: false, reason: "expired" };
    if (rec.consumed) return { ok: false, reason: "already_consumed" };
    // atomic from JS single-thread perspective
    rec.consumed = true;
    rec.consumedAt = Date.now();
    this.map.set(token, rec);
    return { ok: true, record: { ...rec } };
  }

  async delete(token: string): Promise<void> {
    this.map.delete(token);
  }

  clear(): void {
    this.map.clear();
  }
}
