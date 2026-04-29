/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.ECHO.MEMORY.AUTHORITY.POLICY
REGION: 💾 DATA
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#60A5FA
FLUO=#93C5FD
PASTEL=#DBEAFE

ICON_ASCII:
family=lucide
glyph=database

5WH:
WHAT = Memory authority policy for Echo Core — defines who may request memory reads and writes,
       what path rules apply, and what is blocked outright
WHY = Law 3: no memory write outside Echo-approved pathways; this file makes that law executable
      and guards Memory Lake from unauthorised mutation
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/echo/MemoryAuthorityPolicy.ts
WHEN = 2026
HOW = Policy rule table, MemoryAccessRequest type, MemoryAccessResult, and
      authoriseMemoryAccess() function

AGENTS:
ECHO
AUDIT
SHIELD

CONSTITUTIONAL_RULE:
"Echo is the only authority for long-term continuity writes. Memory Lake is authoritative and local-first."

LICENSE:
MIT
*/

import type { LeewayRole } from "../lee-prime/AuthorityMatrix";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Request shape
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryOperation = "READ" | "WRITE" | "DELETE" | "AUDIT";

export interface MemoryAccessRequest {
  requestId: string;
  requestingUnit: LeewayRole;
  operation: MemoryOperation;
  /**
   * The Memory Lake path being accessed.
   * Must start with "/" and use the LEONARD drive convention.
   * e.g. "/lexicon/slang_pack.json", "/receipts/run-001.json"
   */
  path: string;
  /** Whether a collaboration receipt is attached to this request. */
  receiptAttached: boolean;
  /** Payload being written (required for WRITE). */
  writePayload?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Result shape
// ─────────────────────────────────────────────────────────────────────────────

export type MemoryAccessDecision = "ALLOW" | "DENY" | "ALLOW_READ_ONLY";

export interface MemoryAccessResult {
  requestId: string;
  decision: MemoryAccessDecision;
  reason: string;
  /** True when the access is permitted to proceed. */
  allowed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Write authority table
//   Only these roles may write to Memory Lake.
//   All other roles are READ-only at best.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full write authority.
 * Echo Core is the sole unrestricted writer.
 */
const FULL_WRITE_AUTHORITY: readonly LeewayRole[] = Object.freeze([
  "ECHO_CORE",
]);

/**
 * Conditional write authority.
 * These roles may write only execution receipts (not cognitive state).
 * Each write must carry a receipt and must target an approved path prefix.
 */
const CONDITIONAL_WRITE_AUTHORITY: readonly LeewayRole[] = Object.freeze([
  "VERITAS_CORE",   // validation receipts and failure records
  "MCP_AGENT",      // execution receipts only
  "RUNTIME_AGENT",  // execution receipts only
  "WORKER",         // execution receipts only
]);

/**
 * Path prefixes that conditional writers are permitted to target.
 */
const CONDITIONAL_WRITE_ALLOWED_PATHS: readonly string[] = Object.freeze([
  "/receipts/",
  "/run-logs/",
  "/audit/",
]);

/**
 * Roles that may READ from Memory Lake (no writes ever).
 */
const READ_ONLY_AUTHORITY: readonly LeewayRole[] = Object.freeze([
  "LEE_PRIME",
  "ORIGIN_CORE",
  "STRUCTURE_CORE",
  "VECTOR_CORE",
  "SYNTHESIS_CORE",
  "STANDARDS_AGENT",
  "DISCOVERY_AGENT",
  "INTEGRITY_AGENT",
  "SECURITY_AGENT",
  "TOOL",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Policy runner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforces Memory Lake access rules for a given request.
 *
 * Rules checked:
 *   1. Receipt must be attached for any access.
 *   2. DELETE is blocked for all roles except ECHO_CORE.
 *   3. WRITE from ECHO_CORE — always allowed (with receipt).
 *   4. WRITE from conditional roles — allowed only to approved path prefixes.
 *   5. WRITE from all other roles — denied.
 *   6. READ — allowed for roles in the read authority tables.
 *   7. AUDIT — allowed for LEE_PRIME and ECHO_CORE only.
 */
export function authoriseMemoryAccess(req: MemoryAccessRequest): MemoryAccessResult {

  // ── Structural guard: receipt required ────────────────────────────────────
  if (!req.receiptAttached) {
    return {
      requestId: req.requestId,
      decision: "DENY",
      reason: "Memory access denied: no collaboration receipt attached.",
      allowed: false,
    };
  }

  // ── DELETE guard ──────────────────────────────────────────────────────────
  if (req.operation === "DELETE") {
    if (!(FULL_WRITE_AUTHORITY as string[]).includes(req.requestingUnit)) {
      return {
        requestId: req.requestId,
        decision: "DENY",
        reason: `DELETE is restricted to ECHO_CORE. ${req.requestingUnit} is not authorised.`,
        allowed: false,
      };
    }
    return { requestId: req.requestId, decision: "ALLOW", reason: "DELETE authorised: ECHO_CORE.", allowed: true };
  }

  // ── WRITE: full authority ─────────────────────────────────────────────────
  if (req.operation === "WRITE") {
    if ((FULL_WRITE_AUTHORITY as string[]).includes(req.requestingUnit)) {
      return { requestId: req.requestId, decision: "ALLOW", reason: "WRITE authorised: full write authority.", allowed: true };
    }

    // Conditional write authority — path must match approved prefixes
    if ((CONDITIONAL_WRITE_AUTHORITY as string[]).includes(req.requestingUnit)) {
      const pathOk = CONDITIONAL_WRITE_ALLOWED_PATHS.some((prefix) => req.path.startsWith(prefix));
      if (pathOk) {
        return {
          requestId: req.requestId,
          decision: "ALLOW",
          reason: `WRITE authorised: ${req.requestingUnit} to approved receipt/audit path.`,
          allowed: true,
        };
      }
      return {
        requestId: req.requestId,
        decision: "DENY",
        reason: `WRITE denied: ${req.requestingUnit} may only write to receipt/audit paths. Path "${req.path}" is not approved.`,
        allowed: false,
      };
    }

    // All other roles: DENY
    return {
      requestId: req.requestId,
      decision: "DENY",
      reason: `WRITE denied: ${req.requestingUnit} has no write authority over Memory Lake.`,
      allowed: false,
    };
  }

  // ── READ: check authority ─────────────────────────────────────────────────
  if (req.operation === "READ") {
    const canRead =
      (FULL_WRITE_AUTHORITY as string[]).includes(req.requestingUnit) ||
      (CONDITIONAL_WRITE_AUTHORITY as string[]).includes(req.requestingUnit) ||
      (READ_ONLY_AUTHORITY as string[]).includes(req.requestingUnit);

    if (canRead) {
      return { requestId: req.requestId, decision: "ALLOW_READ_ONLY", reason: `READ authorised for ${req.requestingUnit}.`, allowed: true };
    }
    return {
      requestId: req.requestId,
      decision: "DENY",
      reason: `READ denied: ${req.requestingUnit} is not in the read authority table.`,
      allowed: false,
    };
  }

  // ── AUDIT ─────────────────────────────────────────────────────────────────
  if (req.operation === "AUDIT") {
    const canAudit: readonly string[] = ["LEE_PRIME", "ECHO_CORE", "INTEGRITY_AGENT", "SECURITY_AGENT"];
    if (canAudit.includes(req.requestingUnit)) {
      return { requestId: req.requestId, decision: "ALLOW_READ_ONLY", reason: `AUDIT authorised for ${req.requestingUnit}.`, allowed: true };
    }
    return {
      requestId: req.requestId,
      decision: "DENY",
      reason: `AUDIT denied: ${req.requestingUnit} does not have audit authority.`,
      allowed: false,
    };
  }

  // ── Unknown operation ─────────────────────────────────────────────────────
  return {
    requestId: req.requestId,
    decision: "DENY",
    reason: `Unknown memory operation "${req.operation as string}".`,
    allowed: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Utility exports
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true when a role has full write authority (Echo only). */
export function hasFullWriteAuthority(role: LeewayRole): boolean {
  return (FULL_WRITE_AUTHORITY as string[]).includes(role);
}

/** Returns true when a role has any write authority (full or conditional). */
export function hasAnyWriteAuthority(role: LeewayRole): boolean {
  return (
    (FULL_WRITE_AUTHORITY as string[]).includes(role) ||
    (CONDITIONAL_WRITE_AUTHORITY as string[]).includes(role)
  );
}

/** Returns the approved write path prefixes for conditional writers. */
export function getConditionalWritePaths(): readonly string[] {
  return CONDITIONAL_WRITE_ALLOWED_PATHS;
}
