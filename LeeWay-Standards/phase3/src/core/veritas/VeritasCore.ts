import { ExecutionState, ValidationIssue, ValidationResult } from "@/types/runtime";

interface RuleContext {
  state: ExecutionState;
  issues: ValidationIssue[];
  signals: Record<string, number | boolean | string>;
}

interface ValidationRule {
  id: string;
  description: string;
  evaluate(ctx: RuleContext): void;
}

function addIssue(ctx: RuleContext, issue: Omit<ValidationIssue, "source"> & { source?: string }): void {
  ctx.issues.push({ ...issue, source: issue.source ?? "VERITAS_CORE" });
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const RULES: ValidationRule[] = [
  {
    id: "PLAN_PRESENT",
    description: "Execution must have a non-empty plan.",
    evaluate(ctx) {
      if (!Array.isArray(ctx.state.plan) || ctx.state.plan.length === 0) {
        addIssue(ctx, {
          code: "NO_PLAN",
          message: "Execution ran without a structured plan.",
          severity: "error",
          weight: 45,
        });
      } else {
        ctx.signals.planLength = ctx.state.plan.length;
      }
    },
  },
  {
    id: "RESULTS_PRESENT",
    description: "Execution must produce result data.",
    evaluate(ctx) {
      if (!ctx.state.results || Object.keys(ctx.state.results).length === 0) {
        addIssue(ctx, {
          code: "EMPTY_RESULTS",
          message: "Execution returned no result fields.",
          severity: "error",
          weight: 40,
        });
      } else {
        ctx.signals.resultKeys = Object.keys(ctx.state.results).length;
      }
    },
  },
  {
    id: "SUMMARY_PRESENT",
    description: "Results should include a usable summary.",
    evaluate(ctx) {
      const summary = safeText(ctx.state.results?.summary);
      if (!summary) {
        addIssue(ctx, {
          code: "MISSING_SUMMARY",
          message: "Result did not include a summary field.",
          severity: "warn",
          weight: 8,
        });
      } else {
        ctx.signals.summaryLength = summary.length;
      }
    },
  },
  {
    id: "CLARIFICATION_ON_AMBIGUITY",
    description: "Ambiguous inputs should yield clarification or a ranked decision.",
    evaluate(ctx) {
      const ambiguous = Boolean(ctx.state.origin?.ambiguous || ctx.state.negotiation?.requiresClarification);
      const clarification = safeText(ctx.state.results?.clarificationQuestion);
      if (ambiguous && !clarification && !ctx.state.negotiation?.finalIntent) {
        addIssue(ctx, {
          code: "AMBIGUITY_UNRESOLVED",
          message: "Ambiguous input did not produce clarification or negotiated resolution.",
          severity: "error",
          weight: 35,
        });
      }
      ctx.signals.ambiguous = ambiguous;
      ctx.signals.clarificationProvided = Boolean(clarification);
    },
  },
  {
    id: "POLICY_BLOCK_DANGEROUS",
    description: "Dangerous destructive commands must be blocked.",
    evaluate(ctx) {
      const input = ctx.state.input.toLowerCase();
      const destructive = /(delete all|wipe|erase everything|destroy database)/i.test(input);
      if (destructive) {
        addIssue(ctx, {
          code: "POLICY_BLOCK",
          message: "Destructive command matched a hard policy block.",
          severity: "error",
          weight: 100,
        });
      }
      ctx.signals.policySafe = !destructive;
    },
  },
  {
    id: "RAG_USED_WHEN_REQUIRED",
    description: "When negotiation requires retrieval, RAG context should be present.",
    evaluate(ctx) {
      const requiresRag = Boolean(ctx.state.negotiation?.requiresRag);
      const rag = ctx.state.context?.rag;
      const hasRag = Array.isArray(rag) ? rag.length > 0 : Boolean(rag);
      if (requiresRag && !hasRag) {
        addIssue(ctx, {
          code: "RAG_MISSING",
          message: "Retrieval was required but no grounded context was attached.",
          severity: "warn",
          weight: 12,
        });
      }
      ctx.signals.requiresRag = requiresRag;
      ctx.signals.hasRag = hasRag;
    },
  },
  {
    id: "MEMORY_USED_WHEN_REQUIRED",
    description: "When memory recall is required, Echo context should be present.",
    evaluate(ctx) {
      const requiresMemory = Boolean(ctx.state.negotiation?.requiresMemoryRecall);
      const memory = ctx.state.context?.memory;
      const hasMemory = Array.isArray(memory) ? memory.length > 0 : Boolean(memory);
      if (requiresMemory && !hasMemory) {
        addIssue(ctx, {
          code: "MEMORY_CONTEXT_MISSING",
          message: "Memory recall was requested but Echo returned no usable context.",
          severity: "warn",
          weight: 10,
        });
      }
      ctx.signals.requiresMemory = requiresMemory;
      ctx.signals.hasMemory = hasMemory;
    },
  },
];

function scoreIssues(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= issue.weight;
  }
  return Math.max(0, Math.min(100, score));
}

function deriveConfidence(score: number, issues: ValidationIssue[]): number {
  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warn").length;
  let confidence = score / 100;
  confidence -= errorCount * 0.18;
  confidence -= warnCount * 0.04;
  return Number(Math.max(0, Math.min(1, confidence)).toFixed(2));
}

function deriveDisposition(score: number, issues: ValidationIssue[]): ValidationResult["disposition"] {
  const hasError = issues.some((i) => i.severity === "error");
  if (hasError || score < 55) return "block";
  if (score < 85) return "revise";
  return "approve";
}

export async function validateResult(results: Record<string, unknown>, state: ExecutionState): Promise<ValidationResult> {
  const ctx: RuleContext = {
    state: { ...state, results },
    issues: [],
    signals: {},
  };

  for (const rule of RULES) {
    rule.evaluate(ctx);
  }

  const score = scoreIssues(ctx.issues);
  const confidence = deriveConfidence(score, ctx.issues);
  const disposition = deriveDisposition(score, ctx.issues);

  return {
    passed: disposition === "approve",
    score,
    confidence,
    issues: ctx.issues,
    signals: ctx.signals,
    disposition,
  };
}
