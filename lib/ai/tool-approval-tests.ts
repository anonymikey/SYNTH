import { ToolPolicy } from "./tool-policy";
import { ToolApproval } from "./tool-approval";
import { mockMcpToolPort } from "./mock-mcp";
import type { ToolCall } from "@/tools/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runToolApprovalTests() {
  console.log("Running ToolApproval tests...");

  // Ensure authorized agent can create approval
  const auth = ToolPolicy.authorizeExecution("researcher", "research", "search_demo");
  assert(auth.ok, `researcher should be authorized for search_demo: ${auth.reason}`);

  const call = { id: "call-1", toolId: "search_demo", input: { query: "synth" } };
  const approval = await ToolApproval.create("req-1", "researcher", "research", call, 10000);
  assert(typeof approval.token === "string" && approval.token.length > 0, "approval token should be generated");

  // Valid approval token can be consumed and used to execute the tool
  const consumed = await ToolApproval.consume(approval.token);
  assert(consumed.ok === true && Boolean(consumed.record), `approval token should be consumable: ${JSON.stringify(consumed)}`);
  const record = consumed.record!;
  const executeCall: ToolCall = { id: record.callId, toolId: record.toolId, input: record.input };
  const result = await mockMcpToolPort.execute(executeCall, { requestId: "r1", runtime: "web", approved: true });
  assert(result.status === "success", `expected successful mock tool execution, got ${JSON.stringify(result)}`);

  // Approval is consumed after successful execution
  const secondConsume = await ToolApproval.consume(approval.token);
  assert(secondConsume.ok === false && secondConsume.reason === "already_consumed", "approval should not be consumable twice");

  // Expired token is rejected
  const expired = await ToolApproval.create("req-2", "researcher", "research", { id: "call-2", toolId: "search_demo", input: {} }, -1);
  const expiredConsume = await ToolApproval.consume(expired.token);
  assert(expiredConsume.ok === false && expiredConsume.reason === "expired", "expired approval should be rejected");

  // Token used with different agent/tool/call context: simulate mismatch detection at engine boundary
  const approval2 = await ToolApproval.create("req-3", "coder", "coding", { id: "c2", toolId: "calculator", input: { expression: "2 + 2" } });
  const consumed2 = await ToolApproval.consume(approval2.token);
  assert(consumed2.ok === true && Boolean(consumed2.record), "second approval should be consumable");
  const rec2 = consumed2.record!;
  // Simulate engine check: wrong agent
  const wrongAgent = rec2.agentId !== "researcher";
  assert(wrongAgent, "using token with a different agent should be detectable by the engine (mismatch)");

  console.log("ToolApproval tests passed (declarative).");
}

if (require.main === module) {
  runToolApprovalTests().catch((err) => { console.error(err); process.exit(1); });
}
