/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.GOVERNANCE.GATE.MAIN
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#F59E0B
FLUO=#FCD34D
PASTEL=#FEF3C7

ICON_ASCII:
family=lucide
glyph=lock

5WH:
WHAT = GovernanceGate — the single enforcer that validates every cross-unit call against
       the authority matrix, allowed transitions, and collaboration contracts before
       execution proceeds
WHY = Collaboration without a gate is trust without proof; this file makes the laws real
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/governance/GovernanceGate.ts
WHEN = 2026
HOW = Synchronous gate function checkGate() that returns a GateResult; all blocking is
      fail-closed; violations emit a structured GateViolation record

AGENTS:
SHIELD
AUDIT
VERIFY

CONSTITUTIONAL_RULE:
"Agent Lee Cores think, Leeway Standards govern, hive agents serve, and Lee Prime commands."

LICENSE:
MIT
*/

import {
  resolvePermission,
  isAllowed,
  type LeewayRole,
  type MatrixAction,
  type Permission,
} from "../lee-prime/AuthorityMatrix";
import { canTransition } from "../../collaboration/AllowedTransitions";
import { resolveContract } from "../../collaboration/CollaborationContract";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Gate types
// ─────────────────────────────────────────────────────────────────────────────

export type GateDecision = "PASS" | "BLOCK" | "PASS_WITH_VALIDATION" | "PASS_WITH_RECEIPT";

export interface GateRequest {
  from: LeewayRole;
  to: LeewayRole;
  action: MatrixAction;
  /** Whether a validated result is already attached to this request. */
  validationAttached?: boolean;
  /** Whether a receipt will be produced by the caller. */
  receiptPledged?: boolean;
}

export interface GateViolation {
  rule: string;
  reason: string;
  from: LeewayRole;
  to: LeewayRole;
  action: MatrixAction;
  blockedBy: "AUTHORITY_MATRIX" | "TRANSITION_TABLE" | "CONTRACT_CONSTRAINT" | "PERMISSION_DENIED";
}

export interface GateResult {
  decision: GateDecision;
  permission: Permission;
  violations: GateViolation[];
  /** True when gate is open and the call may proceed. */
  allowed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Gate implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enforces every collaboration law for a given cross-unit call.
 *
 * Laws checked in order:
 *   1. Authority matrix — is (from, to, action) in the allowed set?
 *   2. Transition table — may `from` call `to` at all?
 *   3. Contract constraints — does the `from` contract permit calling `to`?
 *   4. Permission conditions — does the caller satisfy receipt/validation pledges?
 *
 * Any DENY at any layer → decision is BLOCK (fail-closed).
 */
export function checkGate(req: GateRequest): GateResult {
  const violations: GateViolation[] = [];
  const permission = resolvePermission(req.from, req.to, req.action);

  // ── Check 1: Authority matrix ──────────────────────────────────────────────
  if (!isAllowed(req.from, req.to, req.action)) {
    violations.push({
      rule: "AUTHORITY_MATRIX",
      reason: `No rule permits ${req.from} → ${req.to} [${req.action}].`,
      from: req.from,
      to: req.to,
      action: req.action,
      blockedBy: "AUTHORITY_MATRIX",
    });
  }

  // ── Check 2: Transition table ─────────────────────────────────────────────
  if (!canTransition(req.from, req.to)) {
    violations.push({
      rule: "TRANSITION_TABLE",
      reason: `${req.from} is not allowed to call ${req.to} per the transition table.`,
      from: req.from,
      to: req.to,
      action: req.action,
      blockedBy: "TRANSITION_TABLE",
    });
  }

  // ── Check 3: Contract constraints ─────────────────────────────────────────
  const contract = resolveContract(req.from);
  if (contract) {
    const canCall = (contract.collaboration.mayCall as string[]).includes(req.to);
    if (!canCall) {
      violations.push({
        rule: "CONTRACT_CONSTRAINT",
        reason: `${req.from} contract does not list ${req.to} in mayCall.`,
        from: req.from,
        to: req.to,
        action: req.action,
        blockedBy: "CONTRACT_CONSTRAINT",
      });
    }
  }

  // ── Check 4: Permission conditions ────────────────────────────────────────
  if (permission === "ALLOW_WITH_RECEIPT" && !req.receiptPledged) {
    violations.push({
      rule: "RECEIPT_REQUIRED",
      reason: `Action ${req.action} from ${req.from} → ${req.to} requires a receipt pledge.`,
      from: req.from,
      to: req.to,
      action: req.action,
      blockedBy: "PERMISSION_DENIED",
    });
  }

  if (
    (permission === "ALLOW_WITH_VALIDATION" || permission === "ALLOW_WITH_VALIDATION_AND_RECEIPT") &&
    !req.validationAttached
  ) {
    violations.push({
      rule: "VALIDATION_REQUIRED",
      reason: `Action ${req.action} from ${req.from} → ${req.to} requires validation before proceeding.`,
      from: req.from,
      to: req.to,
      action: req.action,
      blockedBy: "PERMISSION_DENIED",
    });
  }

  // ── Resolve decision ───────────────────────────────────────────────────────
  if (violations.length > 0) {
    return { decision: "BLOCK", permission, violations, allowed: false };
  }

  let decision: GateDecision = "PASS";
  if (permission === "ALLOW_WITH_VALIDATION_AND_RECEIPT") decision = "PASS_WITH_RECEIPT";
  else if (permission === "ALLOW_WITH_RECEIPT") decision = "PASS_WITH_RECEIPT";
  else if (permission === "ALLOW_WITH_VALIDATION") decision = "PASS_WITH_VALIDATION";

  return { decision, permission, violations: [], allowed: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Assertion helper (throws on block)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asserts that a collaboration call is allowed.
 * Throws a structured error if the gate blocks the call.
 * Use this at the top of every cross-unit method.
 *
 * @example
 * assertGate({ from: "STRUCTURE_CORE", to: "VERITAS_CORE", action: "REQUEST_VALIDATION", receiptPledged: true });
 */
export function assertGate(req: GateRequest): GateResult {
  const result = checkGate(req);
  if (!result.allowed) {
    const summary = result.violations.map((v) => v.reason).join("; ");
    const err = new Error(`[GovernanceGate] BLOCKED — ${summary}`);
    (err as Error & { violations: GateViolation[] }).violations = result.violations;
    throw err;
  }
  return result;
}
