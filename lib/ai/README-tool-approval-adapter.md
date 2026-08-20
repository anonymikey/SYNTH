ToolApproval Store Adapter

Purpose
-------
This document describes the ToolApprovalStore adapter contract and the guarantees required from a production persistence adapter (e.g., Redis or database) that can replace the in-memory store.

Interface (ToolApprovalStore)
- create(args): create and persist an approval record and return it (record includes token)
- get(token): read the approval record if it exists and is not expired
- consume(token): atomically mark the approval consumed and return the record if successful; must return failure reasons "not_found_or_expired", "expired", or "already_consumed" where applicable
- delete(token): delete the record

Critical guarantees for production adapters
------------------------------------------
1. Atomic consume
   - The consume(token) operation MUST be atomic across concurrent processes. Exactly one concurrent consumer can succeed; all other concurrent attempts must fail with reason "already_consumed".
   - Redis implementers should use Lua scripts or the WATCH/MULTI/EXEC pattern or a single key atomic command (e.g., HSETNX + TTL) to ensure atomicity.

2. TTL and expiration
   - The adapter must enforce token TTL server-side. Expired tokens must either be auto-removed by the store or cause get/consume to return "expired" or undefined.

3. Unforgeability
   - Tokens are opaque and unguessable (server issues random UUIDs). Adapters must not accept client-provided records.

4. Auditability
   - Adapter should not log tokens. It may log metadata (requestId, agentId, toolId, callId) for audit purposes, but sensitive input should not be logged unless explicitly marked safe.

5. Single source of truth
   - The adapter is the authoritative source for approval state (created, consumed, expired). SynthEngine and ToolApproval facade must rely on the adapter for state transitions.

6. Safety during restarts
   - The adapter must persist records so that approvals survive process restarts.

Notes for implementers
----------------------
- Use strong randomness for token generation (UUID v4 or better).
- Avoid storing raw sensitive input in logs. Store input as needed but restrict access.
- Provide an atomic consume API — for Redis this typically maps to a Lua script that checks expiry, consumed flag, sets consumed and consumedAt atomically, and returns the prior state.

This file is intended as a short guide for future adapters; the current default remains the in-memory store for local/demo usage.
