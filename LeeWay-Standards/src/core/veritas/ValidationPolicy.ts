/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.VERITAS.VALIDATION.POLICY
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#F472B6
FLUO=#F9A8D4
PASTEL=#FCE7F3

ICON_ASCII:
family=lucide
glyph=check-circle-2

5WH:
WHAT = Canonical validation policy for Veritas Core — the compliance rules every output must
       pass before Lee Prime may deliver it to the user
WHY = Law 4: no user-facing output without a Veritas pass; this file makes that law executable
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/veritas/ValidationPolicy.ts
WHEN = 2026
HOW = Policy rule list, ValidationReport type, and runValidationPolicy() function

AGENTS:
VERIFY
AUDIT
SHIELD

CONSTITUTIONAL_RULE:
"No core and no runtime tool should produce user-facing results without passing validation."

LICENSE:
MIT
*/

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Policy rule type
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ValidationRule {
  ruleId: string;
  description: string;
  severity: ValidationSeverity;
  /**
   * Returns true when the payload passes this rule.
   * Must be synchronous; pure; throw-safe.
   */
  test(payload: ValidationPayload): boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Payload shape
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationPayload {
  requestId: string;
  schemaType: string;
  outputPayload: unknown;
  sourceUnit: string;
  /** Whether the unit declares itself as the final speaker. */
  claimsUserFacing: boolean;
  /** Whether a receipt was attached to this request. */
  receiptAttached: boolean;
  /** Whether Veritas was invoked directly or bypassed. */
  veritasCalled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Validation result
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationStatus = "PASS" | "FAIL" | "BLOCKED";

export interface RuleResult {
  ruleId: string;
  severity: ValidationSeverity;
  passed: boolean;
  message: string;
}

export interface ValidationReport {
  requestId: string;
  timestamp: string;
  sourceUnit: string;
  status: ValidationStatus;
  complianceScore: number;   // 0.0 – 1.0
  criticalFailures: number;
  ruleResults: RuleResult[];
  blockedBy?: string;        // ruleId of first critical failure
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Policy rules
// ─────────────────────────────────────────────────────────────────────────────

const VALIDATION_RULES: ValidationRule[] = [

  // ── Rule V-01: No unit other than Lee Prime may speak to the user ──────────
  {
    ruleId: "V-01",
    description: "Only LEE_PRIME may produce user-facing output.",
    severity: "CRITICAL",
    test(p) {
      if (p.claimsUserFacing && p.sourceUnit !== "LEE_PRIME") return false;
      return true;
    },
  },

  // ── Rule V-02: Receipt must be present ────────────────────────────────────
  {
    ruleId: "V-02",
    description: "A collaboration receipt must be attached to all validated outputs.",
    severity: "HIGH",
    test(p) {
      return p.receiptAttached === true;
    },
  },

  // ── Rule V-03: Veritas must have been called ──────────────────────────────
  {
    ruleId: "V-03",
    description: "Veritas Core must have been invoked before user-facing delivery.",
    severity: "CRITICAL",
    test(p) {
      if (p.claimsUserFacing && !p.veritasCalled) return false;
      return true;
    },
  },

  // ── Rule V-04: requestId must be present ──────────────────────────────────
  {
    ruleId: "V-04",
    description: "Every validated payload must carry a non-empty requestId.",
    severity: "HIGH",
    test(p) {
      return typeof p.requestId === "string" && p.requestId.trim().length > 0;
    },
  },

  // ── Rule V-05: schemaType must be declared ────────────────────────────────
  {
    ruleId: "V-05",
    description: "Every validated payload must declare a schemaType.",
    severity: "HIGH",
    test(p) {
      return typeof p.schemaType === "string" && p.schemaType.trim().length > 0;
    },
  },

  // ── Rule V-06: outputPayload must not be null ──────────────────────────────
  {
    ruleId: "V-06",
    description: "The output payload must not be null or undefined.",
    severity: "CRITICAL",
    test(p) {
      return p.outputPayload !== null && p.outputPayload !== undefined;
    },
  },

  // ── Rule V-07: sourceUnit must be a known LeewayRole string ───────────────
  {
    ruleId: "V-07",
    description: "The sourceUnit must be a non-empty identifier string.",
    severity: "MEDIUM",
    test(p) {
      return typeof p.sourceUnit === "string" && p.sourceUnit.trim().length > 0;
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Runner
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the full validation policy against a payload.
 * Returns a ValidationReport — callers must check `report.status` before proceeding.
 *
 * Status:
 *   PASS  — all rules passed; output may proceed to Lee Prime
 *   FAIL  — one or more HIGH/MEDIUM rules failed; escalate
 *   BLOCKED — one or more CRITICAL rules failed; hard block
 */
export function runValidationPolicy(payload: ValidationPayload): ValidationReport {
  const ruleResults: RuleResult[] = [];
  let criticalFailures = 0;
  let highFailures = 0;
  let blockedBy: string | undefined;

  for (const rule of VALIDATION_RULES) {
    let passed = false;
    try {
      passed = rule.test(payload);
    } catch {
      passed = false;
    }

    ruleResults.push({
      ruleId: rule.ruleId,
      severity: rule.severity,
      passed,
      message: passed
        ? `${rule.ruleId} passed.`
        : `${rule.ruleId} FAILED: ${rule.description}`,
    });

    if (!passed) {
      if (rule.severity === "CRITICAL") {
        criticalFailures += 1;
        if (!blockedBy) blockedBy = rule.ruleId;
      } else if (rule.severity === "HIGH") {
        highFailures += 1;
      }
    }
  }

  const totalRules = VALIDATION_RULES.length;
  const passedCount = ruleResults.filter((r) => r.passed).length;
  const complianceScore = totalRules > 0 ? passedCount / totalRules : 0;

  const status: ValidationStatus =
    criticalFailures > 0 ? "BLOCKED" : highFailures > 0 ? "FAIL" : "PASS";

  return {
    requestId: payload.requestId,
    timestamp: new Date().toISOString(),
    sourceUnit: payload.sourceUnit,
    status,
    complianceScore: Number(complianceScore.toFixed(3)),
    criticalFailures,
    ruleResults,
    blockedBy,
  };
}

/** Returns all registered validation rules (read-only, for audits). */
export function getValidationRules(): readonly ValidationRule[] {
  return VALIDATION_RULES;
}
