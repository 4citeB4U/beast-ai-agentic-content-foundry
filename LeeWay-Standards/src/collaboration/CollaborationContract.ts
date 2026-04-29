/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.COLLABORATION.CONTRACT.MAIN
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#FFD700
FLUO=#FDE68A
PASTEL=#FEF9C3

ICON_ASCII:
family=lucide
glyph=handshake

5WH:
WHAT = Canonical CollaborationContract type and canonical instances for Lee Prime, all Prime Family
       cores, and the standards / service agent tier
WHY = Every runtime unit must declare who it is, who governs it, what it may do, and what happens
      when it fails — so collaboration is explicit, auditable, and non-chaotic
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/collaboration/CollaborationContract.ts
WHEN = 2026
HOW = TypeScript interface + const contract objects; imported by orchestrator, governance gate,
      and the authority matrix resolver

AGENTS:
ASSESS
AUDIT
ALIGN
HEADER

CONSTITUTIONAL_RULE:
"Agent Lee Cores think, Leeway Standards govern, hive agents serve, and Lee Prime commands."

LICENSE:
MIT
*/

import type { AuthorityLevel, LeewayRole } from "../core/lee-prime/AuthorityMatrix";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Core type
// ─────────────────────────────────────────────────────────────────────────────

export type LeewayRegion =
  | "🟢 CORE"
  | "🧠 AI"
  | "🟣 MCP"
  | "🟠 UTIL"
  | "💾 DATA";

export type FailureStrategy = "retry" | "reroute" | "escalate";

export interface CollaborationContract {
  contractId: string;
  version: string;

  unit: {
    id: string;
    role: LeewayRole;
    authority: AuthorityLevel;
    tag: string;
    region: LeewayRegion;
    purpose: string;
  };

  collaboration: {
    /** Policy IDs or standards refs that govern this unit. */
    governedBy: string[];
    /** The unit this one ultimately reports to (usually LEE_PRIME or LEEWAY_LAW). */
    reportsTo: string;
    mayCall: LeewayRole[];
    mayReceiveFrom: LeewayRole[];
    requiresValidationBeforeOutput: boolean;
    /** Only Echo Core may be true here under normal conditions. */
    mayWriteMemory: boolean;
    requiresReceiptForAllActions: boolean;
  };

  inputs: {
    acceptedSchemas: string[];
    requiredFields: string[];
  };

  outputs: {
    emitsSchemas: string[];
    maySpeakToUser: boolean;
    mayChangeRuntimeState: boolean;
  };

  failurePolicy: {
    onFail: FailureStrategy;
    maxRetries: number;
    escalateTo: string;
    mustLogFailure: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Canonical contract instances
// ─────────────────────────────────────────────────────────────────────────────

/** Lee Prime — sovereign orchestrator and sole final speaker. */
export const LeePrimeContract: CollaborationContract = {
  contractId: "contract.lee-prime.v1",
  version: "1.0.0",
  unit: {
    id: "LEE_PRIME",
    role: "LEE_PRIME",
    authority: "SOVEREIGN",
    tag: "CORE.PRIME.LEE.SOVEREIGN",
    region: "🟢 CORE",
    purpose: "Sovereign orchestrator and final speaker.",
  },
  collaboration: {
    governedBy: ["policy.schema-first", "policy.final-speaker", "policy.veritas-required"],
    reportsTo: "LEEWAY_LAW",
    mayCall: [
      "ORIGIN_CORE", "STRUCTURE_CORE", "VERITAS_CORE", "ECHO_CORE",
      "VECTOR_CORE", "SYNTHESIS_CORE", "STANDARDS_AGENT", "DISCOVERY_AGENT",
      "INTEGRITY_AGENT", "SECURITY_AGENT", "MCP_AGENT", "RUNTIME_AGENT", "TOOL",
    ],
    mayReceiveFrom: [
      "ORIGIN_CORE", "STRUCTURE_CORE", "VERITAS_CORE", "ECHO_CORE",
      "VECTOR_CORE", "SYNTHESIS_CORE", "STANDARDS_AGENT", "DISCOVERY_AGENT",
      "INTEGRITY_AGENT", "SECURITY_AGENT", "MCP_AGENT", "RUNTIME_AGENT",
    ],
    requiresValidationBeforeOutput: true,
    mayWriteMemory: false,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["execution-state", "validation-report", "memory-summary", "synthesis-packet"],
    requiredFields: ["requestId", "schemaType", "stateValue", "context"],
  },
  outputs: {
    emitsSchemas: ["final-delivery"],
    maySpeakToUser: true,
    mayChangeRuntimeState: true,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 0,
    escalateTo: "LEEWAY_LAW",
    mustLogFailure: true,
  },
};

/** Origin Core — interprets requests; cannot write memory or deliver to user. */
export const OriginCoreContract: CollaborationContract = {
  contractId: "contract.origin-core.v1",
  version: "1.0.0",
  unit: {
    id: "ORIGIN_CORE",
    role: "ORIGIN_CORE",
    authority: "CORE",
    tag: "CORE.COGNITION.ORIGIN.INTERPRET",
    region: "🧠 AI",
    purpose: "Interprets requests and routes intent to the structure layer.",
  },
  collaboration: {
    governedBy: ["policy.schema-first", "policy.intent-router"],
    reportsTo: "LEE_PRIME",
    mayCall: ["STRUCTURE_CORE", "VECTOR_CORE", "ECHO_CORE", "LEE_PRIME"],
    mayReceiveFrom: ["LEE_PRIME", "DISCOVERY_AGENT"],
    requiresValidationBeforeOutput: false,
    mayWriteMemory: false,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["user-request", "intent-packet", "context-state"],
    requiredFields: ["requestId", "rawInput", "context"],
  },
  outputs: {
    emitsSchemas: ["interpreted-intent", "plan-request", "escalation"],
    maySpeakToUser: false,
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 1,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

/** Structure Core — plans and sequences work; does not validate or deliver. */
export const StructureCoreContract: CollaborationContract = {
  contractId: "contract.structure-core.v1",
  version: "1.0.0",
  unit: {
    id: "STRUCTURE_CORE",
    role: "STRUCTURE_CORE",
    authority: "CORE",
    tag: "CORE.COGNITION.STRUCTURE.PLAN",
    region: "🧠 AI",
    purpose: "Builds ordered execution plans from approved schemas and standards constraints.",
  },
  collaboration: {
    governedBy: ["policy.schema-first", "policy.standards-constraints"],
    reportsTo: "LEE_PRIME",
    mayCall: ["VERITAS_CORE", "ECHO_CORE", "MCP_AGENT", "RUNTIME_AGENT", "LEE_PRIME"],
    mayReceiveFrom: ["LEE_PRIME", "ORIGIN_CORE"],
    requiresValidationBeforeOutput: true,
    mayWriteMemory: false,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["interpreted-intent", "context-state", "memory-summary"],
    requiredFields: ["requestId", "intentSchema", "allowedActions"],
  },
  outputs: {
    emitsSchemas: ["execution-plan", "validation-request", "escalation"],
    maySpeakToUser: false,
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 1,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

/** Veritas Core — validates all output against Leeway law before it reaches the user. */
export const VeritasCoreContract: CollaborationContract = {
  contractId: "contract.veritas-core.v1",
  version: "1.0.0",
  unit: {
    id: "VERITAS_CORE",
    role: "VERITAS_CORE",
    authority: "CORE",
    tag: "CORE.VALIDATION.VERITAS.JUDGE",
    region: "🟢 CORE",
    purpose: "Validates correctness and compliance before any output reaches the user.",
  },
  collaboration: {
    governedBy: ["policy.veritas-required", "policy.schema-first", "policy.compliance-scoring"],
    reportsTo: "LEE_PRIME",
    mayCall: ["ECHO_CORE", "LEE_PRIME"],
    mayReceiveFrom: [
      "LEE_PRIME", "STRUCTURE_CORE", "VECTOR_CORE",
      "STANDARDS_AGENT", "INTEGRITY_AGENT", "SECURITY_AGENT",
      "MCP_AGENT", "RUNTIME_AGENT", "WORKER",
    ],
    requiresValidationBeforeOutput: false, // Veritas IS the validation
    mayWriteMemory: true,                  // Writes validation receipts and failure records only
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["execution-plan", "synthesis-packet", "raw-output", "worker-result"],
    requiredFields: ["requestId", "schemaType", "outputPayload"],
  },
  outputs: {
    emitsSchemas: ["validation-report", "failure-record", "compliance-score", "escalation"],
    maySpeakToUser: false,
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 0,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

/** Echo Core — authoritative memory and continuity layer. */
export const EchoCoreContract: CollaborationContract = {
  contractId: "contract.echo-core.v1",
  version: "1.0.0",
  unit: {
    id: "ECHO_CORE",
    role: "ECHO_CORE",
    authority: "CORE",
    tag: "CORE.COGNITION.ECHO.MEMORY",
    region: "💾 DATA",
    purpose: "Authoritative memory continuity, receipts, and run logging.",
  },
  collaboration: {
    governedBy: ["policy.echo-only-memory-write", "policy.local-first-memory"],
    reportsTo: "LEE_PRIME",
    mayCall: ["LEE_PRIME", "ORIGIN_CORE", "STRUCTURE_CORE", "VERITAS_CORE", "SYNTHESIS_CORE"],
    mayReceiveFrom: [
      "LEE_PRIME", "ORIGIN_CORE", "STRUCTURE_CORE", "VERITAS_CORE",
      "VECTOR_CORE", "SYNTHESIS_CORE", "STANDARDS_AGENT", "MCP_AGENT", "RUNTIME_AGENT",
    ],
    requiresValidationBeforeOutput: false,
    mayWriteMemory: true,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["memory-read-request", "memory-write-request", "receipt", "run-log"],
    requiredFields: ["requestId", "timestamp", "sourceUnit"],
  },
  outputs: {
    emitsSchemas: ["memory-read-result", "memory-write-result", "commit-log-entry"],
    maySpeakToUser: false,
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 1,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

/** Vector Core — retrieves and normalises external information. */
export const VectorCoreContract: CollaborationContract = {
  contractId: "contract.vector-core.v1",
  version: "1.0.0",
  unit: {
    id: "VECTOR_CORE",
    role: "VECTOR_CORE",
    authority: "CORE",
    tag: "CORE.COGNITION.VECTOR.RETRIEVE",
    region: "🟣 MCP",
    purpose: "Retrieves and normalises outside information via search, RAG, and runtime adapters.",
  },
  collaboration: {
    governedBy: ["policy.schema-first", "policy.veritas-required"],
    reportsTo: "LEE_PRIME",
    mayCall: ["VERITAS_CORE", "ECHO_CORE", "LEE_PRIME"],
    mayReceiveFrom: ["LEE_PRIME", "ORIGIN_CORE", "DISCOVERY_AGENT"],
    requiresValidationBeforeOutput: true,
    mayWriteMemory: false,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["retrieval-request", "search-query"],
    requiredFields: ["requestId", "queryType", "queryPayload"],
  },
  outputs: {
    emitsSchemas: ["retrieval-result", "normalised-context"],
    maySpeakToUser: false,
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "reroute",
    maxRetries: 2,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

/** Synthesis Core — renders Agent Lee-compatible output packets. */
export const SynthesisCoreContract: CollaborationContract = {
  contractId: "contract.synthesis-core.v1",
  version: "1.0.0",
  unit: {
    id: "SYNTHESIS_CORE",
    role: "SYNTHESIS_CORE",
    authority: "CORE",
    tag: "CORE.SYNTHESIS.RENDER.OUTPUT",
    region: "🧠 AI",
    purpose: "Renders validated content into Agent Lee-compatible output via persona, poetry, and style layers.",
  },
  collaboration: {
    governedBy: ["policy.schema-first", "policy.persona-downstream-only", "policy.veritas-required"],
    reportsTo: "LEE_PRIME",
    mayCall: ["ECHO_CORE", "LEE_PRIME"],
    mayReceiveFrom: ["LEE_PRIME", "ECHO_CORE"],
    requiresValidationBeforeOutput: true,
    mayWriteMemory: false,
    requiresReceiptForAllActions: true,
  },
  inputs: {
    acceptedSchemas: ["validated-output", "memory-summary", "synthesis-request"],
    requiredFields: ["requestId", "validatedPayload", "toneContext"],
  },
  outputs: {
    emitsSchemas: ["synthesis-packet"],
    maySpeakToUser: false,  // Lee Prime is the final speaker
    mayChangeRuntimeState: false,
  },
  failurePolicy: {
    onFail: "escalate",
    maxRetries: 1,
    escalateTo: "LEE_PRIME",
    mustLogFailure: true,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Contract registry
// ─────────────────────────────────────────────────────────────────────────────

/** Immutable map of all canonical collaboration contracts keyed by unit ID. */
export const CONTRACT_REGISTRY: Readonly<Record<string, CollaborationContract>> = Object.freeze({
  LEE_PRIME:      LeePrimeContract,
  ORIGIN_CORE:    OriginCoreContract,
  STRUCTURE_CORE: StructureCoreContract,
  VERITAS_CORE:   VeritasCoreContract,
  ECHO_CORE:      EchoCoreContract,
  VECTOR_CORE:    VectorCoreContract,
  SYNTHESIS_CORE: SynthesisCoreContract,
});

/**
 * Resolves a CollaborationContract by unit ID.
 * Returns undefined if no contract is registered for that unit.
 */
export function resolveContract(unitId: string): CollaborationContract | undefined {
  return CONTRACT_REGISTRY[unitId];
}
