export interface ApprovalCreatedEvent { requestId: string; agentId: string; toolId: string; callId: string; expiresAt: number; }
export interface ApprovalConsumedEvent { requestId: string; agentId: string; toolId: string; callId: string; consumedAt: number; }
export interface ApprovalRejectedEvent { requestId?: string; agentId?: string; toolId?: string; callId?: string; reason: string; }
export interface ToolExecutionStartedEvent { requestId: string; agentId: string; toolId: string; callId: string; }
export interface ToolExecutionCompletedEvent { requestId: string; agentId: string; toolId: string; callId: string; status: string; }

export interface AuditLogger {
  approval_created(event: ApprovalCreatedEvent): void;
  approval_consumed(event: ApprovalConsumedEvent): void;
  approval_rejected(event: ApprovalRejectedEvent): void;
  tool_execution_started(event: ToolExecutionStartedEvent): void;
  tool_execution_completed(event: ToolExecutionCompletedEvent): void;
}

export const ConsoleAuditLogger: AuditLogger = {
  approval_created(event: ApprovalCreatedEvent) { console.info('[audit] approval_created', { requestId: event.requestId, agentId: event.agentId, toolId: event.toolId, callId: event.callId, expiresAt: event.expiresAt }); },
  approval_consumed(event: ApprovalConsumedEvent) { console.info('[audit] approval_consumed', { requestId: event.requestId, agentId: event.agentId, toolId: event.toolId, callId: event.callId, consumedAt: event.consumedAt }); },
  approval_rejected(event: ApprovalRejectedEvent) { console.warn('[audit] approval_rejected', { requestId: event.requestId, agentId: event.agentId, toolId: event.toolId, callId: event.callId, reason: event.reason }); },
  tool_execution_started(event: ToolExecutionStartedEvent) { console.info('[audit] tool_execution_started', { requestId: event.requestId, agentId: event.agentId, toolId: event.toolId, callId: event.callId }); },
  tool_execution_completed(event: ToolExecutionCompletedEvent) { console.info('[audit] tool_execution_completed', { requestId: event.requestId, agentId: event.agentId, toolId: event.toolId, callId: event.callId, status: event.status }); },
};
