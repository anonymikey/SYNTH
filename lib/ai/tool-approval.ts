import { InMemoryToolApprovalStore, type ToolApprovalStore, type ToolApprovalRecord as StoreRecord } from "./tool-approval-store";
import { ConsoleAuditLogger, type AuditLogger } from "./audit-logger";

// Exported facade for the Tool Approval subsystem. Backed by a store impl. In future, replace store with Redis-backed implementation.

let CURRENT_STORE: ToolApprovalStore = new InMemoryToolApprovalStore();
const AUDIT: AuditLogger = ConsoleAuditLogger;

export type ToolApprovalRecord = StoreRecord;

function clearStore(store: ToolApprovalStore): void {
  if (store instanceof InMemoryToolApprovalStore) store.clear();
}

export const ToolApproval = {
  // Allow swapping the underlying store implementation (for production adapters)
  _setStore(store: ToolApprovalStore) {
    CURRENT_STORE = store;
  },

  async create(requestId: string, agentId: string, intent: import("@/engine/types").EngineIntent | undefined, call: import("@/tools/types").ToolCall, ttlMs?: number) {
    const rec = await CURRENT_STORE.create({ requestId, agentId, intent, call, ttlMs });
    // Audit creation (do not log token)
    AUDIT.approval_created({ requestId: rec.requestId, agentId: rec.agentId, toolId: rec.toolId, callId: rec.callId, expiresAt: rec.expiresAt });
    return rec;
  },
  async get(token: string) {
    return CURRENT_STORE.get(token);
  },
  async consume(token: string) {
    const res = await CURRENT_STORE.consume(token);
    if (!res.ok) {
      AUDIT.approval_rejected({ requestId: res.record?.requestId, agentId: res.record?.agentId, toolId: res.record?.toolId, callId: res.record?.callId, reason: res.reason ?? "unknown" });
      return res;
    }
    const rec = res.record!;
    AUDIT.approval_consumed({ requestId: rec.requestId, agentId: rec.agentId, toolId: rec.toolId, callId: rec.callId, consumedAt: rec.consumedAt ?? Date.now() });
    return res;
  },
  // testing helper
  _clearAll() {
    clearStore(CURRENT_STORE);
  },
};
