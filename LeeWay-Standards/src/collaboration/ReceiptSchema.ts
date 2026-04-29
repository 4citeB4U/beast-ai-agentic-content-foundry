/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.COLLABORATION.RECEIPT.SCHEMA
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#A78BFA
FLUO=#C4B5FD
PASTEL=#EDE9FE

ICON_ASCII:
family=lucide
glyph=receipt

5WH:
WHAT = Receipt schema for every cross-unit collaboration event in the Leeway runtime
WHY = Law 5 states every cross-unit action must produce a receipt — no silent collaboration;
      this file defines the shape, status codes, and emit helper
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/collaboration/ReceiptSchema.ts
WHEN = 2026
HOW = TypeScript interface CollaborationReceipt, ReceiptStatus enum, and emitReceipt() factory

AGENTS:
AUDIT
ECHO
ALIGN

CONSTITUTIONAL_RULE:
"Every cross-unit action requires a receipt. If it happened, it is loggable."

LICENSE:
MIT
*/

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Status
// ─────────────────────────────────────────────────────────────────────────────

export type ReceiptStatus =
  | "SUCCESS"
  | "FAILURE"
  | "BLOCKED"
  | "REROUTED"
  | "ESCALATED";

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Receipt shape
// ─────────────────────────────────────────────────────────────────────────────

export interface CollaborationReceipt {
  /** Unique receipt identifier (UUID or deterministic hash). */
  receiptId: string;
  /** Shared correlation ID from the originating request. */
  requestId: string;
  /** ISO-8601 timestamp of when the action was resolved. */
  timestamp: string;

  /** Unit that initiated the action. */
  fromUnit: string;
  /** Unit that received and processed the action. */
  toUnit: string;
  /** The MatrixAction that was requested. */
  action: string;

  /** Schema name of the input payload. */
  inputSchema: string;
  /** Schema name of the output payload, if one was produced. */
  outputSchema?: string;

  /** Whether Veritas validation was required for this action. */
  validationRequired: boolean;
  /** Whether validation passed. Omit when validationRequired is false. */
  validationPassed?: boolean;

  /** Whether any memory store was read or written during this action. */
  memoryTouched: boolean;
  /** Path in Memory Lake that was written, if applicable. */
  memoryWritePath?: string;

  /** Final status of the collaboration event. */
  status: ReceiptStatus;

  /** Optional human-readable note — for failure reason or audit context. */
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Factory helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates a receipt for a collaboration event.
 * Provide all fields known at resolution time; the rest default safely.
 *
 * @example
 * const r = emitReceipt({
 *   receiptId: crypto.randomUUID(),
 *   requestId: req.requestId,
 *   fromUnit: "STRUCTURE_CORE",
 *   toUnit: "VERITAS_CORE",
 *   action: "REQUEST_VALIDATION",
 *   inputSchema: "execution-plan",
 *   outputSchema: "validation-report",
 *   validationRequired: true,
 *   validationPassed: true,
 *   memoryTouched: false,
 *   status: "SUCCESS",
 * });
 */
export function emitReceipt(
  fields: Omit<CollaborationReceipt, "timestamp"> & { timestamp?: string },
): CollaborationReceipt {
  return {
    timestamp: new Date().toISOString(),
    ...fields,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Guard helper
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when a receipt represents a successful or rerouted (non-failed) outcome. */
export function receiptPassed(receipt: CollaborationReceipt): boolean {
  return receipt.status === "SUCCESS" || receipt.status === "REROUTED";
}

/** Returns true when a receipt requires further investigation or escalation. */
export function receiptBlocked(receipt: CollaborationReceipt): boolean {
  return receipt.status === "BLOCKED" || receipt.status === "FAILURE" || receipt.status === "ESCALATED";
}
