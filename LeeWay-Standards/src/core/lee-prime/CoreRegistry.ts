/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.PRIME.LEE.CORE_REGISTRY
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=layout-list

5WH:
WHAT = Canonical Prime Family registry — unit metadata, authority levels, ownership rules,
       governed-by policies, and reports-to hierarchy
WHY = One source of truth for every cognitive unit in the Lee Prime system so that
      ExecutionEngine and external callers can resolve units, hierarchy, and thinking ownership
      without hard-coding role names across the codebase
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/lee-prime/CoreRegistry.ts
WHEN = 2026
HOW = Typed registry records exported as CORE_REGISTRY map + resolver helpers

AGENTS:
ASSESS
AUDIT
ALIGN

CONSTITUTIONAL_RULE:
"Agent Lee Cores think, Leeway Standards govern, hive agents serve, and Lee Prime commands."

LICENSE:
MIT
*/

import type { LeewayRole, AuthorityLevel } from "./AuthorityMatrix";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Unit metadata shape
// ─────────────────────────────────────────────────────────────────────────────

export type ThinkingDomain =
  | "INTENT_INTERPRETATION"
  | "PLAN_CONSTRUCTION"
  | "VALIDATION"
  | "MEMORY_MANAGEMENT"
  | "RETRIEVAL_NORMALIZATION"
  | "OUTPUT_SYNTHESIS"
  | "SOVEREIGN_COMMAND"
  | "SERVICE_EXECUTION";

export interface CoreUnitMeta {
  /** Canonical role identifier used across the authority matrix and execution engine. */
  role: LeewayRole;
  /** Human-readable display name. */
  displayName: string;
  /** Authority tier this unit operates at. */
  authorityLevel: AuthorityLevel;
  /** The cognitive responsibility owned exclusively by this unit. */
  thinkingDomain: ThinkingDomain;
  /**
   * Role that this unit reports escalations and failures to.
   * undefined for LEE_PRIME — it is the top of the chain.
   */
  reportsTo?: LeewayRole;
  /**
   * Role(s) whose policies govern this unit's operation.
   * All cores are governed by the LEEWAY Standards system.
   */
  governedBy: LeewayRole[];
  /** True when this unit may produce a user-facing delivery (FINAL_DELIVERY action). */
  mayDeliver: boolean;
  /** True when this unit may write to Memory Lake (Echo-gated). */
  mayWriteMemory: boolean;
  /** Brief description of this unit's purpose in the sovereign cycle. */
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Prime Family registry records
// ─────────────────────────────────────────────────────────────────────────────

const LEE_PRIME: CoreUnitMeta = {
  role: "LEE_PRIME",
  displayName: "Lee Prime",
  authorityLevel: "SOVEREIGN",
  thinkingDomain: "SOVEREIGN_COMMAND",
  reportsTo: undefined,
  governedBy: ["STANDARDS_AGENT"],
  mayDeliver: true,
  mayWriteMemory: true,
  description:
    "Sovereign orchestrator and sole final speaker. Receives validated synthesis packets " +
    "and issues the user-facing delivery. Commands every layer of the runtime.",
};

const ORIGIN_CORE: CoreUnitMeta = {
  role: "ORIGIN_CORE",
  displayName: "Origin Core",
  authorityLevel: "CORE",
  thinkingDomain: "INTENT_INTERPRETATION",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Interprets raw perception input into a structured intent object. " +
    "Owns the Perception stage of the sovereign cycle. May not write memory or speak to the user.",
};

const STRUCTURE_CORE: CoreUnitMeta = {
  role: "STRUCTURE_CORE",
  displayName: "Structure Core",
  authorityLevel: "CORE",
  thinkingDomain: "PLAN_CONSTRUCTION",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Constructs sequenced execution plans from interpreted intent. " +
    "Routes execution steps to MCP agents and runtime workers. Requires Veritas validation before delivery.",
};

const VERITAS_CORE: CoreUnitMeta = {
  role: "VERITAS_CORE",
  displayName: "Veritas Core",
  authorityLevel: "CORE",
  thinkingDomain: "VALIDATION",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: true,          // Validation receipts and failure records only.
  description:
    "Validates every output packet before it reaches Lee Prime for delivery. " +
    "Blocks non-compliant packets and escalates failures. No synthesis or plan construction.",
};

const ECHO_CORE: CoreUnitMeta = {
  role: "ECHO_CORE",
  displayName: "Echo Core",
  authorityLevel: "CORE",
  thinkingDomain: "MEMORY_MANAGEMENT",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: true,          // Memory authority — sole write path to Memory Lake.
  description:
    "Memory authority for the entire system. Controls all reads from and writes to Memory Lake. " +
    "Enforces the LEONARD drive convention. No other unit may write memory without Echo approval.",
};

const VECTOR_CORE: CoreUnitMeta = {
  role: "VECTOR_CORE",
  displayName: "Vector Core",
  authorityLevel: "CORE",
  thinkingDomain: "RETRIEVAL_NORMALIZATION",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Retrieves and normalises external information (RAG, embeddings, web, docs). " +
    "Not the memory authority — retrieved data must be validated by Veritas before use.",
};

const SYNTHESIS_CORE: CoreUnitMeta = {
  role: "SYNTHESIS_CORE",
  displayName: "Synthesis Core",
  authorityLevel: "CORE",
  thinkingDomain: "OUTPUT_SYNTHESIS",
  reportsTo: "LEE_PRIME",
  governedBy: ["STANDARDS_AGENT", "LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Renders validated execution results into output packets — prose, structured data, UI deltas. " +
    "Cannot speak to the user directly; hands the packet to Lee Prime for final delivery.",
};

// Service-tier representatives included for hierarchy completeness.
const STANDARDS_AGENT: CoreUnitMeta = {
  role: "STANDARDS_AGENT",
  displayName: "Standards Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "LEE_PRIME",
  governedBy: ["LEE_PRIME"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Enforces LEEWAY governance policies across the runtime. " +
    "Validates file headers, region boundaries, and schema compliance. Escalates violations to Lee Prime.",
};

const DISCOVERY_AGENT: CoreUnitMeta = {
  role: "DISCOVERY_AGENT",
  displayName: "Discovery Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "LEE_PRIME",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Discovers and registers new capabilities, agents, and tools. " +
    "Routes discovery requests through Origin Core for intent interpretation.",
};

const INTEGRITY_AGENT: CoreUnitMeta = {
  role: "INTEGRITY_AGENT",
  displayName: "Integrity Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "LEE_PRIME",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Validates schema conformance, contract integrity, and receipt completeness. " +
    "Escalates integrity failures to Lee Prime.",
};

const SECURITY_AGENT: CoreUnitMeta = {
  role: "SECURITY_AGENT",
  displayName: "Security Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "LEE_PRIME",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Monitors for security violations, prompt injection, and unauthorised access attempts. " +
    "Blocks and escalates threats to Lee Prime.",
};

const MCP_AGENT: CoreUnitMeta = {
  role: "MCP_AGENT",
  displayName: "MCP Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "STRUCTURE_CORE",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Executes MCP tool calls on behalf of Structure Core. " +
    "Requires validation approval before execution. Returns receipts.",
};

const RUNTIME_AGENT: CoreUnitMeta = {
  role: "RUNTIME_AGENT",
  displayName: "Runtime Agent",
  authorityLevel: "SERVICE",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "STRUCTURE_CORE",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Manages runtime state changes — bootstrap, teardown, reload. " +
    "Operates under Structure Core direction and requires validation approval.",
};

const WORKER: CoreUnitMeta = {
  role: "WORKER",
  displayName: "Worker",
  authorityLevel: "TOOL",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "MCP_AGENT",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Low-level task worker (lingo worker, background scripts). " +
    "No authority to route or escalate; reports results upward.",
};

const TOOL: CoreUnitMeta = {
  role: "TOOL",
  displayName: "Tool",
  authorityLevel: "TOOL",
  thinkingDomain: "SERVICE_EXECUTION",
  reportsTo: "MCP_AGENT",
  governedBy: ["LEE_PRIME", "STANDARDS_AGENT"],
  mayDeliver: false,
  mayWriteMemory: false,
  description:
    "Stateless low-level adapter (file ops, HTTP, MCP executor). " +
    "No cognition; transforms inputs to outputs and returns.",
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Sovereign execution order
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The canonical stage sequence for one sovereign execution cycle.
 * Perception (Origin) → Structure → Execution (MCP/Runtime) →
 * Veritas → Echo → Synthesis → Lee Prime
 */
export const SOVEREIGN_EXECUTION_ORDER: readonly LeewayRole[] = [
  "ORIGIN_CORE",
  "STRUCTURE_CORE",
  "MCP_AGENT",
  "VERITAS_CORE",
  "ECHO_CORE",
  "SYNTHESIS_CORE",
  "LEE_PRIME",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Flat registry map
// ─────────────────────────────────────────────────────────────────────────────

export const CORE_REGISTRY: ReadonlyMap<LeewayRole, CoreUnitMeta> = new Map<
  LeewayRole,
  CoreUnitMeta
>([
  ["LEE_PRIME",        LEE_PRIME],
  ["ORIGIN_CORE",      ORIGIN_CORE],
  ["STRUCTURE_CORE",   STRUCTURE_CORE],
  ["VERITAS_CORE",     VERITAS_CORE],
  ["ECHO_CORE",        ECHO_CORE],
  ["VECTOR_CORE",      VECTOR_CORE],
  ["SYNTHESIS_CORE",   SYNTHESIS_CORE],
  ["STANDARDS_AGENT",  STANDARDS_AGENT],
  ["DISCOVERY_AGENT",  DISCOVERY_AGENT],
  ["INTEGRITY_AGENT",  INTEGRITY_AGENT],
  ["SECURITY_AGENT",   SECURITY_AGENT],
  ["MCP_AGENT",        MCP_AGENT],
  ["RUNTIME_AGENT",    RUNTIME_AGENT],
  ["WORKER",           WORKER],
  ["TOOL",             TOOL],
]);

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Resolver helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the metadata for a registered role.
 * Throws if the role is unknown — callers must use valid LeewayRole values.
 */
export function resolveUnit(role: LeewayRole): CoreUnitMeta {
  const meta = CORE_REGISTRY.get(role);
  if (!meta) {
    throw new Error(`[CoreRegistry] Unknown role: "${role}". Register it in CORE_REGISTRY.`);
  }
  return meta;
}

/**
 * Returns all units at or above the given authority level.
 */
export function unitsAtOrAbove(level: AuthorityLevel): CoreUnitMeta[] {
  const hierarchy: AuthorityLevel[] = ["LAW", "SOVEREIGN", "CORE", "SERVICE", "TOOL"];
  const cutoff = hierarchy.indexOf(level);
  return [...CORE_REGISTRY.values()].filter(
    (u) => hierarchy.indexOf(u.authorityLevel) <= cutoff
  );
}

/**
 * Returns the chain of units from a given role up to Lee Prime
 * by following the reportsTo links.
 */
export function escalationChain(from: LeewayRole): CoreUnitMeta[] {
  const chain: CoreUnitMeta[] = [];
  let current: LeewayRole | undefined = from;
  const visited = new Set<LeewayRole>();
  while (current && !visited.has(current)) {
    visited.add(current);
    const meta = CORE_REGISTRY.get(current);
    if (!meta) break;
    chain.push(meta);
    current = meta.reportsTo;
  }
  return chain;
}
