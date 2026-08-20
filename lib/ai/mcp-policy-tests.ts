import { ToolPolicy } from "./tool-policy";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runToolPolicyTests() {
  console.log("Running MCP ToolPolicy tests...");

  // PASS: authorized agent + permitted calculator tool
  const pass1 = ToolPolicy.authorizeExecution("coder", "coding", "calculator");
  assert(pass1.ok, `coder should be authorized for calculator: ${pass1.reason}`);

  // PASS: authorized agent + permitted workspace_info
  const pass2 = ToolPolicy.authorizeExecution("coder", "coding", "workspace_info");
  assert(pass2.ok, `coder should be authorized for workspace_info: ${pass2.reason}`);

  // PASS: authorized agent + permitted search_demo
  const pass3 = ToolPolicy.authorizeExecution("researcher", "research", "search_demo");
  assert(pass3.ok, `researcher should be authorized for search_demo: ${pass3.reason}`);

  // REJECT: toolRequest without agentId
  const r1 = ToolPolicy.authorizeExecution(undefined, "research", "calculator");
  assert((r1.ok ?? false) === false && Boolean(r1.reason && r1.reason.includes("agentId")), "toolRequest without agentId should be rejected");

  // REJECT: nonexistent agentId
  const r2 = ToolPolicy.authorizeExecution("no-such-agent", "research", "calculator");
  assert((r2.ok ?? false) === false && Boolean(r2.reason && r2.reason.includes("not found")), "nonexistent agent should be rejected");

  console.log("MCP ToolPolicy tests passed (declarative).\n");
}

if (require.main === module) {
  runToolPolicyTests().catch((err) => { console.error(err); process.exit(1); });
}
