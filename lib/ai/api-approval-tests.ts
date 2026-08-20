import { parseEngineRequest } from "./request-schema";
import { getSynthEngine } from "./server";
import type { EngineEvent } from "@/engine/types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function run() {
  console.log("Running API approval flow tests...");
  const engine = getSynthEngine();

  // Initial tool request should produce approval-required
  const initialReq = parseEngineRequest({
    requestId: "req-api-1",
    agentId: "researcher",
    mode: "assistant",
    messages: [{ role: "user", content: "Run a search" }],
    toolRequest: { id: "call-api-1", toolId: "search_demo", input: { query: "synth" } },
  });

  const events1 = engine.run({ ...initialReq, signal: undefined });
  let approvalToken: string | undefined = undefined;
  for await (const ev of events1 as AsyncIterable<EngineEvent>) {
    if (ev.type === "approval-required") {
      approvalToken = ev.approvalToken;
      assert(typeof approvalToken === "string" && approvalToken.length > 0, "approval token must be returned");
      break;
    }
    if (ev.type === "failed") {
      throw new Error(`Engine failed during initial request: ${JSON.stringify(ev.error)}`);
    }
  }

  assert(Boolean(approvalToken), "approval token should be present for initial request");

  // Continuation: present the token and expect tool-result
  const contReq = parseEngineRequest({
    requestId: "req-api-1",
    agentId: "researcher",
    mode: "assistant",
    messages: [{ role: "user", content: "Continue" }],
    toolApproval: { token: approvalToken },
  });

  const events2 = engine.run({ ...contReq, signal: undefined });
  let sawResult = false;
  for await (const ev of events2 as AsyncIterable<EngineEvent>) {
    if (ev.type === "tool-result") {
      sawResult = true;
      assert(ev.result && ev.result.status === "success", `expected success tool result, got ${JSON.stringify(ev.result)}`);
      break;
    }
    if (ev.type === "failed") {
      throw new Error(`Engine failed during continuation: ${JSON.stringify(ev.error)}`);
    }
  }

  assert(sawResult, "Continuation should produce a tool-result event");

  // Replayed token should be rejected (already_consumed)
  const replayReq = parseEngineRequest({
    requestId: "req-api-1",
    agentId: "researcher",
    mode: "assistant",
    messages: [{ role: "user", content: "Replay" }],
    toolApproval: { token: approvalToken },
  });

  const events3 = engine.run({ ...replayReq, signal: undefined });
  let sawRejected = false;
  for await (const ev of events3 as AsyncIterable<EngineEvent>) {
    if (ev.type === "failed") {
      sawRejected = true;
      break;
    }
    if (ev.type === "tool-result") {
      throw new Error("Replayed token should not produce a tool-result");
    }
  }

  assert(sawRejected, "Replayed token should be rejected by the engine");

  // Mismatched agentId should be rejected
  const initialReq2 = parseEngineRequest({
    requestId: "req-api-2",
    agentId: "researcher",
    mode: "assistant",
    messages: [{ role: "user", content: "Run a search" }],
    toolRequest: { id: "call-api-2", toolId: "search_demo", input: { query: "synth" } },
  });
  const evs2 = engine.run({ ...initialReq2, signal: undefined });
  let token2: string | undefined;
  for await (const ev of evs2 as AsyncIterable<EngineEvent>) {
    if (ev.type === "approval-required") { token2 = ev.approvalToken; break; }
    if (ev.type === "failed") throw new Error(`Initial failed: ${JSON.stringify(ev.error)}`);
  }
  assert(Boolean(token2), "token2 produced");

  const badAgentCont = parseEngineRequest({ requestId: "req-api-2", agentId: "coder", mode: "assistant", messages: [{ role: "user", content: "Continue" }], toolApproval: { token: token2 } });
  const evsBad = engine.run({ ...badAgentCont, signal: undefined });
  let sawBadRejected = false;
  for await (const ev of evsBad as AsyncIterable<EngineEvent>) {
    if (ev.type === "failed") { sawBadRejected = true; break; }
  }
  assert(sawBadRejected, "Mismatched agentId should be rejected");

  // Mismatched requestId should be rejected
  const badReqCont = parseEngineRequest({ requestId: "req-api-2-wrong", agentId: "researcher", mode: "assistant", messages: [{ role: "user", content: "Continue" }], toolApproval: { token: token2 } });
  const evsBadReq = engine.run({ ...badReqCont, signal: undefined });
  let sawBadReqRejected = false;
  for await (const ev of evsBadReq as AsyncIterable<EngineEvent>) {
    if (ev.type === "failed") { sawBadReqRejected = true; break; }
  }
  assert(sawBadReqRejected, "Mismatched requestId should be rejected");

  console.log("API approval flow tests passed (declarative).\n");
}

if (require.main === module) {
  run().catch((err) => { console.error(err); process.exit(1); });
}
