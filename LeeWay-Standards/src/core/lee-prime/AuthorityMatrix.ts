/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.PRIME.LEE.AUTHORITY_MATRIX
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=shield

5WH:
WHAT = Canonical authority matrix — who may call whom, with what permission, for every LeewayRole pair
WHY = Establishes non-negotiable collaboration law so Agent Lee cores, standards agents, and services
      operate as one governed system rather than a loose pile of modules
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/lee-prime/AuthorityMatrix.ts
WHEN = 2026
HOW = TypeScript const arrays of AuthorityMatrixRule; exported as flat AUTHORITY_MATRIX and
      lookup helper resolvePermission()

AGENTS:
ASSESS
AUDIT
SHIELD
ALIGN

CONSTITUTIONAL_RULE:
"Agent Lee Cores think, Leeway Standards govern, hive agents serve, and Lee Prime commands."

LICENSE:
MIT
*/

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Authority levels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hierarchy (highest → lowest):
 *   LAW > SOVEREIGN > CORE > SERVICE > TOOL
 */
export type AuthorityLevel =
  | "LAW"       // Leeway Standards — non-negotiable rule source
  | "SOVEREIGN" // Lee Prime — commands the whole runtime
  | "CORE"      // Prime Family cognitive units
  | "SERVICE"   // Standards / hive / runtime agents
  | "TOOL";     // Low-level adapters, MCP executors

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — System roles
// ─────────────────────────────────────────────────────────────────────────────

export type LeewayRole =
  | "LEE_PRIME"
  | "ORIGIN_CORE"
  | "STRUCTURE_CORE"
  | "VERITAS_CORE"
  | "ECHO_CORE"
  | "VECTOR_CORE"
  | "SYNTHESIS_CORE"
  | "STANDARDS_AGENT"
  | "DISCOVERY_AGENT"
  | "INTEGRITY_AGENT"
  | "SECURITY_AGENT"
  | "MCP_AGENT"
  | "RUNTIME_AGENT"
  | "WORKER"
  | "TOOL";

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Permission types
// ─────────────────────────────────────────────────────────────────────────────

export type Permission =
  | "ALLOW"
  | "ALLOW_WITH_VALIDATION"
  | "ALLOW_WITH_RECEIPT"
  | "ALLOW_WITH_VALIDATION_AND_RECEIPT"
  | "DENY";

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Action types
// ─────────────────────────────────────────────────────────────────────────────

export type MatrixAction =
  | "REQUEST_PLAN"
  | "REQUEST_INTERPRETATION"
  | "REQUEST_VALIDATION"
  | "REQUEST_MEMORY_READ"
  | "REQUEST_MEMORY_WRITE"
  | "REQUEST_RETRIEVAL"
  | "REQUEST_SYNTHESIS"
  | "REQUEST_EXECUTION"
  | "REQUEST_DIAGNOSTIC"
  | "CHANGE_STATE"
  | "FINAL_DELIVERY"
  | "REGISTER_AGENT"
  | "LOAD_POLICY"
  | "ESCALATE_FAILURE";

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Rule shape
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthorityMatrixRule {
  from: LeewayRole;
  to: LeewayRole;
  action: MatrixAction;
  permission: Permission;
  notes?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 6 — Rule tables per role
// ─────────────────────────────────────────────────────────────────────────────

/** Lee Prime — sovereign; may invoke any layer; sole final speaker. */
const LEE_PRIME_RULES: AuthorityMatrixRule[] = [
  { from: "LEE_PRIME", to: "ORIGIN_CORE",    action: "REQUEST_INTERPRETATION",           permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "STRUCTURE_CORE", action: "REQUEST_PLAN",                     permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "VERITAS_CORE",   action: "REQUEST_VALIDATION",               permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "ECHO_CORE",      action: "REQUEST_MEMORY_READ",              permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "ECHO_CORE",      action: "REQUEST_MEMORY_WRITE",             permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "VECTOR_CORE",    action: "REQUEST_RETRIEVAL",                permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "SYNTHESIS_CORE", action: "REQUEST_SYNTHESIS",                permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "MCP_AGENT",      action: "REQUEST_EXECUTION",                permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },
  { from: "LEE_PRIME", to: "RUNTIME_AGENT",  action: "CHANGE_STATE",                     permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },
  { from: "LEE_PRIME", to: "TOOL",           action: "REQUEST_EXECUTION",                permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },
  { from: "LEE_PRIME", to: "LEE_PRIME",      action: "FINAL_DELIVERY",                   permission: "ALLOW" },
  { from: "LEE_PRIME", to: "STANDARDS_AGENT",action: "REGISTER_AGENT",                   permission: "ALLOW_WITH_RECEIPT" },
  { from: "LEE_PRIME", to: "STANDARDS_AGENT",action: "LOAD_POLICY",                      permission: "ALLOW_WITH_RECEIPT" },
];

/** Origin Core — interprets intent; may not write memory or deliver to user. */
const ORIGIN_RULES: AuthorityMatrixRule[] = [
  { from: "ORIGIN_CORE", to: "STRUCTURE_CORE", action: "REQUEST_PLAN",       permission: "ALLOW_WITH_RECEIPT" },
  { from: "ORIGIN_CORE", to: "ECHO_CORE",      action: "REQUEST_MEMORY_READ",permission: "ALLOW_WITH_RECEIPT" },
  { from: "ORIGIN_CORE", to: "VECTOR_CORE",    action: "REQUEST_RETRIEVAL",  permission: "ALLOW_WITH_RECEIPT" },
  { from: "ORIGIN_CORE", to: "LEE_PRIME",      action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "ORIGIN_CORE", to: "ECHO_CORE",      action: "REQUEST_MEMORY_WRITE",permission: "DENY",             notes: "Origin may not write memory directly." },
  { from: "ORIGIN_CORE", to: "LEE_PRIME",      action: "FINAL_DELIVERY",     permission: "DENY" },
];

/** Structure Core — plans and sequences; does not validate or speak to user. */
const STRUCTURE_RULES: AuthorityMatrixRule[] = [
  { from: "STRUCTURE_CORE", to: "MCP_AGENT",     action: "REQUEST_EXECUTION",  permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },
  { from: "STRUCTURE_CORE", to: "RUNTIME_AGENT", action: "REQUEST_EXECUTION",  permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },
  { from: "STRUCTURE_CORE", to: "VERITAS_CORE",  action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "STRUCTURE_CORE", to: "ECHO_CORE",     action: "REQUEST_MEMORY_READ",permission: "ALLOW_WITH_RECEIPT" },
  { from: "STRUCTURE_CORE", to: "LEE_PRIME",     action: "FINAL_DELIVERY",     permission: "DENY" },
];

/** Veritas Core — validates, blocks, scores, escalates; does not plan or synthesize. */
const VERITAS_RULES: AuthorityMatrixRule[] = [
  { from: "VERITAS_CORE", to: "ECHO_CORE",      action: "REQUEST_MEMORY_WRITE",permission: "ALLOW_WITH_RECEIPT", notes: "Validation receipts and failure records." },
  { from: "VERITAS_CORE", to: "LEE_PRIME",      action: "ESCALATE_FAILURE",    permission: "ALLOW_WITH_RECEIPT" },
  { from: "VERITAS_CORE", to: "SYNTHESIS_CORE", action: "REQUEST_SYNTHESIS",   permission: "DENY",               notes: "Synthesis may not begin before validation completes." },
];

/** Echo Core — memory authority; reads may be served to other cores. */
const ECHO_RULES: AuthorityMatrixRule[] = [
  { from: "ECHO_CORE", to: "LEE_PRIME",      action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "ECHO_CORE", to: "ORIGIN_CORE",    action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "ECHO_CORE", to: "STRUCTURE_CORE", action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "ECHO_CORE", to: "VERITAS_CORE",   action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "ECHO_CORE", to: "SYNTHESIS_CORE", action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
];

/** Vector Core — retrieves and normalises external information; is not memory authority. */
const VECTOR_RULES: AuthorityMatrixRule[] = [
  { from: "VECTOR_CORE", to: "ECHO_CORE",    action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "VECTOR_CORE", to: "VERITAS_CORE", action: "REQUEST_VALIDATION",  permission: "ALLOW_WITH_RECEIPT" },
  { from: "VECTOR_CORE", to: "LEE_PRIME",    action: "FINAL_DELIVERY",      permission: "DENY" },
];

/** Synthesis Core — renders output packets; cannot bypass Veritas or speak directly. */
const SYNTHESIS_RULES: AuthorityMatrixRule[] = [
  { from: "SYNTHESIS_CORE", to: "ECHO_CORE",  action: "REQUEST_MEMORY_READ", permission: "ALLOW_WITH_RECEIPT" },
  { from: "SYNTHESIS_CORE", to: "LEE_PRIME",  action: "REQUEST_SYNTHESIS",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "SYNTHESIS_CORE", to: "LEE_PRIME",  action: "FINAL_DELIVERY",      permission: "DENY" },
];

/** Standards / integrity / security agents — service tier; escalate up to Lee Prime. */
const SERVICE_AGENT_RULES: AuthorityMatrixRule[] = [
  { from: "STANDARDS_AGENT",  to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "STANDARDS_AGENT",  to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "STANDARDS_AGENT",  to: "ECHO_CORE",    action: "REQUEST_MEMORY_WRITE",permission: "DENY",             notes: "Standards agents may not write memory directly." },

  { from: "DISCOVERY_AGENT",  to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "DISCOVERY_AGENT",  to: "ORIGIN_CORE",  action: "REQUEST_INTERPRETATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "DISCOVERY_AGENT",  to: "VECTOR_CORE",  action: "REQUEST_RETRIEVAL",  permission: "ALLOW_WITH_RECEIPT" },

  { from: "INTEGRITY_AGENT",  to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "INTEGRITY_AGENT",  to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },

  { from: "SECURITY_AGENT",   to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "SECURITY_AGENT",   to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },

  { from: "MCP_AGENT",        to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "MCP_AGENT",        to: "STRUCTURE_CORE",action: "REQUEST_PLAN",      permission: "DENY",             notes: "MCP agents receive plans; they do not initiate them." },
  { from: "MCP_AGENT",        to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "MCP_AGENT",        to: "ECHO_CORE",    action: "REQUEST_MEMORY_WRITE",permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT", notes: "Only execution receipts; not cognitive state." },

  { from: "RUNTIME_AGENT",    to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "RUNTIME_AGENT",    to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "RUNTIME_AGENT",    to: "ECHO_CORE",    action: "REQUEST_MEMORY_WRITE",permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },

  { from: "WORKER",           to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "WORKER",           to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
  { from: "WORKER",           to: "ECHO_CORE",    action: "REQUEST_MEMORY_WRITE",permission: "ALLOW_WITH_VALIDATION_AND_RECEIPT" },

  { from: "TOOL",             to: "LEE_PRIME",    action: "ESCALATE_FAILURE",   permission: "ALLOW_WITH_RECEIPT" },
  { from: "TOOL",             to: "VERITAS_CORE", action: "REQUEST_VALIDATION", permission: "ALLOW_WITH_RECEIPT" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 7 — Flat matrix export
// ─────────────────────────────────────────────────────────────────────────────

export const AUTHORITY_MATRIX: readonly AuthorityMatrixRule[] = Object.freeze([
  ...LEE_PRIME_RULES,
  ...ORIGIN_RULES,
  ...STRUCTURE_RULES,
  ...VERITAS_RULES,
  ...ECHO_RULES,
  ...VECTOR_RULES,
  ...SYNTHESIS_RULES,
  ...SERVICE_AGENT_RULES,
]);

// ─────────────────────────────────────────────────────────────────────────────
// Section 8 — Lookup helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves the permission for a given (from, to, action) triple.
 * If no explicit rule exists, returns "DENY" (fail-closed).
 */
export function resolvePermission(
  from: LeewayRole,
  to: LeewayRole,
  action: MatrixAction,
): Permission {
  for (const rule of AUTHORITY_MATRIX) {
    if (rule.from === from && rule.to === to && rule.action === action) {
      return rule.permission;
    }
  }
  return "DENY"; // fail-closed default
}

/**
 * Returns true when the permission level permits execution
 * (i.e., is not DENY).
 */
export function isAllowed(
  from: LeewayRole,
  to: LeewayRole,
  action: MatrixAction,
): boolean {
  return resolvePermission(from, to, action) !== "DENY";
}

/**
 * Returns all rules originating from the given role.
 */
export function rulesFor(from: LeewayRole): readonly AuthorityMatrixRule[] {
  return AUTHORITY_MATRIX.filter((r) => r.from === from);
}
