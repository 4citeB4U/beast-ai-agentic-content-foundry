/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

PROFILE: LEEWAY-ORDER
TAG: CORE.PRIME.LEE.EXECUTION_ENGINE
REGION: 🟢 CORE
VERSION: 1.0.0

COLOR_ONION_HEX:
NEON=#00FFFF
FLUO=#00E5FF
PASTEL=#B2EBF2

ICON_ASCII:
family=lucide
glyph=cpu

5WH:
WHAT = Sovereign execution engine — orchestrates one full cycle through the Prime Family stages:
       Perception → Origin → Structure → Execution → Veritas → Echo → Synthesis → Lee Prime
WHY = Establishes a typed, receipt-generating, retry/escalation-aware runner that makes the
      sovereign cycle explicit and auditable
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = src/core/lee-prime/ExecutionEngine.ts
WHEN = 2026
HOW = TypeScript class SovereignExecutionEngine; stage handlers; receipt builder;
      retry logic; fallback execution unit helper

AGENTS:
ASSESS
AUDIT
SHIELD
ALIGN

CONSTITUTIONAL_RULE:
"No user-facing output without a Veritas pass. Lee Prime speaks last and only after validation."

LICENSE:
MIT
*/

import type { LeewayRole, MatrixAction } from "./AuthorityMatrix";
import { resolvePermission } from "./AuthorityMatrix";
import { resolveUnit, SOVEREIGN_EXECUTION_ORDER } from "./CoreRegistry";

// ─────────────────────────────────────────────────────────────────────────────
// Section 1 — Input / output shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface PerceptionInput {
  /** Raw user input or sensor event to process. */
  rawInput: string;
  /** Channel the input arrived on (voice, text, vision, system). */
  channel: "voice" | "text" | "vision" | "system";
  /** ISO-8601 timestamp of when input was received. */
  receivedAt: string;
  /** Arbitrary context passed in from the calling layer. */
  context?: Record<string, unknown>;
}

export interface StageResult {
  stage: LeewayRole;
  /** Whether this stage completed successfully. */
  success: boolean;
  /** Normalised output from this stage, forwarded to the next. */
  output: unknown;
  /** Milliseconds taken. */
  durationMs: number;
  /** Error detail if success === false. */
  error?: string;
}

export interface ExecutionReceipt {
  cycleId: string;
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  input: PerceptionInput;
  stages: StageResult[];
  /** Final delivery output from Lee Prime (if cycle succeeded). */
  finalOutput?: unknown;
  /** True when the full cycle passed Veritas validation. */
  veritasApproved: boolean;
  /** Number of retry attempts made during this cycle. */
  retryCount: number;
  /** Whether the cycle ended in an escalation rather than normal delivery. */
  escalated: boolean;
  /** Role that caused an escalation (if any). */
  escalatedFrom?: LeewayRole;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 2 — Stage handler type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A stage handler receives the accumulated pipeline context and returns
 * its own StageResult.  Handlers must not write to Memory Lake directly —
 * only Echo Core's handler may do so.
 */
export type StageHandler = (
  stage: LeewayRole,
  pipeline: StagePipeline
) => Promise<StageResult>;

export interface StagePipeline {
  input: PerceptionInput;
  stageResults: StageResult[];
  /** Accumulated output forwarded from the previous stage. */
  currentPayload: unknown;
  cycleId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 3 — Execution engine
// ─────────────────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;

export class SovereignExecutionEngine {
  private handlers: Map<LeewayRole, StageHandler>;
  private onReceiptEmitted?: (receipt: ExecutionReceipt) => void;

  constructor(options?: {
    onReceiptEmitted?: (receipt: ExecutionReceipt) => void;
  }) {
    this.handlers = new Map();
    this.onReceiptEmitted = options?.onReceiptEmitted;
  }

  // ── Registration ─────────────────────────────────────────────────────────

  /**
   * Registers a stage handler for the given role.
   * Must be called before run() for each stage in SOVEREIGN_EXECUTION_ORDER.
   */
  register(role: LeewayRole, handler: StageHandler): this {
    this.handlers.set(role, handler);
    return this;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /**
   * Runs one full sovereign execution cycle.
   *
   * Stages execute in SOVEREIGN_EXECUTION_ORDER.
   * If a stage fails, retry logic applies up to MAX_RETRIES.
   * After MAX_RETRIES, the cycle escalates to LEE_PRIME.
   */
  async run(input: PerceptionInput): Promise<ExecutionReceipt> {
    const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date().toISOString();
    const stageResults: StageResult[] = [];
    let currentPayload: unknown = input.rawInput;
    let veritasApproved = false;
    let retryCount = 0;
    let escalated = false;
    let escalatedFrom: LeewayRole | undefined;

    const pipeline: StagePipeline = {
      input,
      stageResults,
      currentPayload,
      cycleId,
    };

    for (const stage of SOVEREIGN_EXECUTION_ORDER) {
      const handler = this.handlers.get(stage) ?? this._defaultHandler(stage);

      // Authority check: verify the previous stage is allowed to hand off to this one.
      if (stageResults.length > 0) {
        const prevStage = stageResults[stageResults.length - 1].stage;
        const action = this._handoffAction(prevStage, stage);
        const permission = resolvePermission(prevStage, stage, action);
        if (permission === "DENY") {
          escalated = true;
          escalatedFrom = prevStage;
          break;
        }
      }

      let attempt = 0;
      let result: StageResult | undefined;

      while (attempt <= MAX_RETRIES) {
        const stageStart = Date.now();
        try {
          pipeline.currentPayload = currentPayload;
          result = await handler(stage, pipeline);
          result.durationMs = Date.now() - stageStart;
          break;
        } catch (err) {
          attempt++;
          retryCount++;
          const errMsg = err instanceof Error ? err.message : String(err);
          if (attempt > MAX_RETRIES) {
            result = {
              stage,
              success: false,
              output: null,
              durationMs: Date.now() - stageStart,
              error: `Max retries exceeded. Last error: ${errMsg}`,
            };
            escalated = true;
            escalatedFrom = stage;
          }
        }
      }

      if (!result) break;

      stageResults.push(result);

      if (!result.success) {
        escalated = true;
        escalatedFrom = result.stage;
        break;
      }

      // Veritas approval gate
      if (stage === "VERITAS_CORE") {
        veritasApproved = result.output === true || (result.output as any)?.approved === true;
        if (!veritasApproved) {
          escalated = true;
          escalatedFrom = "VERITAS_CORE";
          break;
        }
      }

      currentPayload = result.output;
    }

    const completedAt = new Date().toISOString();
    const totalDurationMs =
      new Date(completedAt).getTime() - new Date(startedAt).getTime();

    const receipt: ExecutionReceipt = {
      cycleId,
      startedAt,
      completedAt,
      totalDurationMs,
      input,
      stages: stageResults,
      finalOutput: !escalated ? currentPayload : undefined,
      veritasApproved,
      retryCount,
      escalated,
      escalatedFrom,
    };

    this.onReceiptEmitted?.(receipt);
    return receipt;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Maps a stage-to-stage handoff to the appropriate MatrixAction.
   */
  private _handoffAction(from: LeewayRole, to: LeewayRole): MatrixAction {
    const actionMap: Partial<Record<LeewayRole, MatrixAction>> = {
      ORIGIN_CORE:    "REQUEST_PLAN",
      STRUCTURE_CORE: "REQUEST_EXECUTION",
      MCP_AGENT:      "REQUEST_VALIDATION",
      VERITAS_CORE:   "REQUEST_MEMORY_WRITE",
      ECHO_CORE:      "REQUEST_SYNTHESIS",
      SYNTHESIS_CORE: "FINAL_DELIVERY",
    };
    return actionMap[from] ?? "REQUEST_EXECUTION";
  }

  /**
   * Returns a pass-through no-op handler for stages that have no registered handler.
   * Logs a warning so missing wiring is visible.
   */
  private _defaultHandler(stage: LeewayRole): StageHandler {
    return async (_stage, pipeline) => {
      const unit = resolveUnit(stage);
      console.warn(
        `[ExecutionEngine] No handler registered for ${unit.displayName} (${stage}). ` +
        `Using pass-through default.`
      );
      return {
        stage,
        success: true,
        output: pipeline.currentPayload,
        durationMs: 0,
      };
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 4 — Fallback execution unit
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a minimal fallback StageResult for a stage that failed to initialise.
 * Used by callers that need to produce a receipt even when a handler is absent.
 */
export function fallbackStageResult(
  stage: LeewayRole,
  reason: string
): StageResult {
  return {
    stage,
    success: false,
    output: null,
    durationMs: 0,
    error: `[Fallback] ${reason}`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section 5 — Receipt helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable summary of an ExecutionReceipt.
 */
export function summariseReceipt(receipt: ExecutionReceipt): string {
  const status = receipt.escalated ? "ESCALATED" : receipt.veritasApproved ? "OK" : "BLOCKED";
  const stageList = receipt.stages.map((s) => `${s.stage}:${s.success ? "✓" : "✗"}`).join(" → ");
  return (
    `[${receipt.cycleId}] ${status} ` +
    `| ${receipt.totalDurationMs}ms ` +
    `| retries:${receipt.retryCount} ` +
    `| stages: ${stageList}` +
    (receipt.escalatedFrom ? ` | escalated from: ${receipt.escalatedFrom}` : "")
  );
}
