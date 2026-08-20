import { InMemoryToolApprovalStore } from "./tool-approval-store";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function run() {
  console.log("Running ToolApprovalStore concurrency tests...");
  const store = new InMemoryToolApprovalStore();

  // Create an approval
  const rec = await store.create({ requestId: "r1", agentId: "researcher", intent: "research", call: { id: "c1", toolId: "search_demo", input: { query: "synth" } } });
  assert(Boolean(rec.token && rec.token.length > 0), "token created");

  // Attempt two concurrent consumes
  const [a, b] = await Promise.all([store.consume(rec.token), store.consume(rec.token)]);
  const okCount = Number(a.ok) + Number(b.ok);
  assert(okCount === 1, `exactly one consumer should succeed, got ${okCount}`);

  // Ensure consumed record cannot be consumed again
  const second = await store.consume(rec.token);
  assert(!second.ok && second.reason === "already_consumed", "already consumed should be rejected");

  // Expired token
  const expired = await store.create({ requestId: "r2", agentId: "researcher", intent: "research", call: { id: "c2", toolId: "search_demo", input: {} }, ttlMs: -1 });
  const expConsume = await store.consume(expired.token);
  assert(!expConsume.ok && expConsume.reason === "expired", "expired token rejected");

  // Ensure get returns undefined for expired
  const got = await store.get(expired.token);
  assert(!got, "expired record should not be returned by get");

  console.log("ToolApprovalStore concurrency tests passed.");
}

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
}
