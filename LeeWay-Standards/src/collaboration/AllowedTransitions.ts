/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.COLLABORATION.TRANSITIONS.ALLOWED
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#34D399
FLUO=#6EE7B7
PASTEL=#D1FAE5

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = Allowable transition table — every LeewayRole declares which other roles it may call next
WHY = Prevents cross-calling chaos; without this, collaboration becomes a free-for-all that
      violates the sovereign hierarchy
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/collaboration/AllowedTransitions.ts
WHEN = 2026
HOW = Immutable Record<LeewayRole, LeewayRole[]> plus canTransition() guard

AGENTS:
ASSESS
AUDIT
SHIELD

CONSTITUTIONAL_RULE:
"Services do not outrank cores. Cores do not outrank law. Law does not outrank truth."

LICENSE:
MIT
*/

import type { LeewayRole } from "../core/lee-prime/AuthorityMatrix";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Transition table
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Defines exactly which roles a given role may call next.
 * Not listed → DENY (fail-closed).
 *
 * This table encodes the operating handshake:
 *   Perception → Origin → Structure → Execution → Veritas → Echo → Synthesis → Lee Prime
 */
export const AllowedTransitions: Readonly<Record<LeewayRole, readonly LeewayRole[]>> = Object.freeze({

  // ── Sovereign ─────────────────────────────────────────────────────────────
  LEE_PRIME: Object.freeze([
    "ORIGIN_CORE",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
    "ECHO_CORE",
    "VECTOR_CORE",
    "SYNTHESIS_CORE",
    "STANDARDS_AGENT",
    "DISCOVERY_AGENT",
    "INTEGRITY_AGENT",
    "SECURITY_AGENT",
    "MCP_AGENT",
    "RUNTIME_AGENT",
    "TOOL",
  ] as const),

  // ── Cognitive cores ───────────────────────────────────────────────────────
  ORIGIN_CORE: Object.freeze([
    "STRUCTURE_CORE",
    "VECTOR_CORE",
    "ECHO_CORE",
    "LEE_PRIME",
  ] as const),

  STRUCTURE_CORE: Object.freeze([
    "VERITAS_CORE",
    "ECHO_CORE",
    "MCP_AGENT",
    "RUNTIME_AGENT",
    "LEE_PRIME",
  ] as const),

  VERITAS_CORE: Object.freeze([
    "ECHO_CORE",
    "LEE_PRIME",
  ] as const),

  ECHO_CORE: Object.freeze([
    "LEE_PRIME",
    "ORIGIN_CORE",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
    "SYNTHESIS_CORE",
  ] as const),

  VECTOR_CORE: Object.freeze([
    "VERITAS_CORE",
    "ECHO_CORE",
    "LEE_PRIME",
  ] as const),

  SYNTHESIS_CORE: Object.freeze([
    "ECHO_CORE",
    "LEE_PRIME",
  ] as const),

  // ── Service / hive agents ─────────────────────────────────────────────────
  STANDARDS_AGENT: Object.freeze([
    "LEE_PRIME",
    "VERITAS_CORE",
    "ECHO_CORE",
  ] as const),

  DISCOVERY_AGENT: Object.freeze([
    "LEE_PRIME",
    "ORIGIN_CORE",
    "VECTOR_CORE",
  ] as const),

  INTEGRITY_AGENT: Object.freeze([
    "LEE_PRIME",
    "VERITAS_CORE",
  ] as const),

  SECURITY_AGENT: Object.freeze([
    "LEE_PRIME",
    "VERITAS_CORE",
  ] as const),

  MCP_AGENT: Object.freeze([
    "LEE_PRIME",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
    "ECHO_CORE",
  ] as const),

  RUNTIME_AGENT: Object.freeze([
    "LEE_PRIME",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
    "ECHO_CORE",
  ] as const),

  WORKER: Object.freeze([
    "LEE_PRIME",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
    "ECHO_CORE",
  ] as const),

  // ── Tool layer (lowest; cannot initiate cognitive actions) ─────────────────
  TOOL: Object.freeze([
    "LEE_PRIME",
    "STRUCTURE_CORE",
    "VERITAS_CORE",
  ] as const),
});

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Guard helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when `from` is allowed to call `to`.
 * Uses the AllowedTransitions table; anything not listed returns false (fail-closed).
 */
export function canTransition(from: LeewayRole, to: LeewayRole): boolean {
  const targets = AllowedTransitions[from];
  return targets ? (targets as readonly string[]).includes(to) : false;
}

/**
 * Returns all roles that `from` may call.
 */
export function allowedTargets(from: LeewayRole): readonly LeewayRole[] {
  return AllowedTransitions[from] ?? Object.freeze([]);
}

/**
 * Returns all roles that may call `to`.
 */
export function allowedCallers(to: LeewayRole): readonly LeewayRole[] {
  return (Object.keys(AllowedTransitions) as LeewayRole[]).filter((from) =>
    canTransition(from, to),
  );
}
