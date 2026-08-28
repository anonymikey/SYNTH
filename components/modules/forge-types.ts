/**
 * Forge Build Loop — typed contracts for the proposal → approval → edit → build flow.
 *
 * These types are shared between the Forge UI and the engine action layer.
 * The actual edit/build adapters live server-side; the client only sees proposals
 * and build results through the existing SSE event stream.
 */

/* ------------------------------------------------------------------ */
/*  Forge Task State Machine                                           */
/* ------------------------------------------------------------------ */

export type ForgeTaskState =
  | "idle"
  | "working"
  | "plan-ready"
  | "proposal-ready"
  | "awaiting-approval"
  | "approved"
  | "editing"
  | "building"
  | "preview-ready"
  | "error";

/* ------------------------------------------------------------------ */
/*  Affected File                                                      */
/* ------------------------------------------------------------------ */

export interface AffectedFile {
  /** Relative file path */
  path: string;
  /** Number of lines to be added */
  additions: number;
  /** Number of lines to be removed */
  deletions: number;
  /** Human-readable reason for the change */
  reason: string;
  /** Operation type */
  operation: "create" | "update" | "delete";
}

/* ------------------------------------------------------------------ */
/*  Forge Proposal                                                     */
/* ------------------------------------------------------------------ */

export type ProposalStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "applied"
  | "failed";

export interface ForgeProposal {
  /** Unique proposal ID */
  id: string;
  /** The requestId that generated this proposal */
  requestId: string;
  /** Human-readable summary of the proposed change */
  summary: string;
  /** Files that will be affected */
  affectedFiles: AffectedFile[];
  /** Structured diff output (unified diff format) */
  diff: string;
  /** ISO timestamp */
  createdAt: string;
  /** Current status */
  status: ProposalStatus;
}

/* ------------------------------------------------------------------ */
/*  Build Result                                                       */
/* ------------------------------------------------------------------ */

export type BuildStatus = "success" | "failed" | "cancelled" | "unavailable";

export interface BuildResult {
  status: BuildStatus;
  /** Build output logs (truncated for display) */
  output: string;
  /** Error message if failed */
  errors?: string;
  /** Duration in milliseconds */
  duration: number;
}

/* ------------------------------------------------------------------ */
/*  Preview State                                                      */
/* ------------------------------------------------------------------ */

export type PreviewState =
  | "no-preview"
  | "preparing"
  | "building"
  | "live"
  | "build-error";

/* ------------------------------------------------------------------ */
/*  Forge Message (extended)                                           */
/* ------------------------------------------------------------------ */

export interface ForgeMessage {
  role: "user" | "assistant";
  content: string;
  requestId: string;
  label?: string;
  /** Optional proposal attached to this message */
  proposal?: ForgeProposal;
  /** Build result if this message produced a build */
  buildResult?: BuildResult;
}
