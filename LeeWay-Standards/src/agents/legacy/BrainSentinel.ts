/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.SENTINEL.BRAIN
TAG: AI.ORCHESTRATION.AGENT.BRAINSENTINEL.MONITOR

COLOR_ONION_HEX:
NEON=#10B981
FLUO=#34D399
PASTEL=#A7F3D0

ICON_ASCII:
family=lucide
glyph=activity

5WH:
WHAT = Brain Sentinel — Neural Overseer; monitors system health, agent execution budgets, and runtime mode selection
WHY = Without budget enforcement, agents can simultaneously consume all resources; Brain Sentinel prevents overload by gating execution capacity
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/BrainSentinel.ts
WHEN = 2026-04-04
HOW = Static class using EventBus to monitor agent:active/done events; tracks concurrent agent count; enforces budget modes (FULL/BALANCED/LEAN/MINIMAL)

AGENTS:
ASSESS
AUDIT
SENTINEL

LICENSE:
MIT
*/

// agents/BrainSentinel.ts — Neural Overseer
// Monitors agent concurrency, runtime budget, and system resource health.
// Switches between budget modes: FULL → BALANCED → LEAN → MINIMAL.
// Emits system:mode events when thresholds are crossed.

import { ReportWriter } from '../../core/ReportWriter';
import { eventBus } from '../../core/EventBus';

const AGENT_ID = 'Brain_Sentinel';
const FAMILY   = 'SENTINEL' as const;

export type BudgetMode = 'FULL' | 'BALANCED' | 'LEAN' | 'MINIMAL';

export interface SystemHealth {
  mode: BudgetMode;
  activeAgents: string[];
  concurrentCount: number;
  peakConcurrent: number;
  totalTasksThisSession: number;
  lastModeChange: string;
}

const MODE_THRESHOLDS: Record<BudgetMode, number> = {
  FULL:     6,   // Up to 6 concurrent agents
  BALANCED: 4,   // Up to 4 concurrent agents
  LEAN:     2,   // Up to 2 concurrent agents
  MINIMAL:  1,   // Only 1 at a time
};

export class BrainSentinel {
  private static activeAgents: Set<string> = new Set();
  private static peakConcurrent = 0;
  private static totalTasks = 0;
  private static currentMode: BudgetMode = 'FULL';
  private static modeChangedAt: string = new Date().toISOString();
  private static initialized = false;
  private static healthTimer: ReturnType<typeof setInterval> | null = null;

  /** Initialize Brain Sentinel: attach EventBus listeners. */
  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    eventBus.on('agent:active', (payload: { agent: string }) => {
      this.activeAgents.add(payload.agent);
      this.totalTasks++;
      const count = this.activeAgents.size;
      if (count > this.peakConcurrent) this.peakConcurrent = count;
      this.evaluateMode();
    });

    eventBus.on('agent:done', (payload: { agent: string }) => {
      this.activeAgents.delete(payload.agent);
      this.evaluateMode();
    });

    // Periodic health report every 10 minutes
    this.healthTimer = setInterval(() => {
      this.reportHealth();
    }, 10 * 60 * 1000);
  }

  static teardown(): void {
    if (this.healthTimer) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
    this.initialized = false;
  }

  /** Check if an additional agent execution is within budget for current mode. */
  static canActivate(agentName: string): boolean {
    const cap = MODE_THRESHOLDS[this.currentMode];
    const wouldBe = this.activeAgents.size + (this.activeAgents.has(agentName) ? 0 : 1);
    return wouldBe <= cap;
  }

  /** Evaluate and switch budget mode based on current load. */
  private static evaluateMode(): void {
    const count = this.activeAgents.size;
    let targetMode: BudgetMode = 'FULL';

    if (count >= 5)      targetMode = 'MINIMAL';
    else if (count >= 4) targetMode = 'LEAN';
    else if (count >= 3) targetMode = 'BALANCED';
    else                 targetMode = 'FULL';

    if (targetMode !== this.currentMode) {
      const prev = this.currentMode;
      this.currentMode = targetMode;
      this.modeChangedAt = new Date().toISOString();

      eventBus.emit('brain:budget_changed', {
        mode: targetMode,
        maxActiveAgents: MODE_THRESHOLDS[targetMode],
        writePolicy: targetMode === 'MINIMAL' ? 'NO_PARALLEL_WRITES' : 'STANDARD',
      });

      ReportWriter.write({
        ts: new Date().toISOString(),
        report_class: 'SYSTEM',
        family: FAMILY,
        severity: count >= 5 ? 'WARN' : 'INFO',
        event: 'MODE_CHANGE',
        message: `BrainSentinel: budget mode changed ${prev} → ${targetMode} (${count} active agents)`,
        agent_id: AGENT_ID,
      }).catch(console.error);
    }
  }

  /** Emit a health report to the report ledger. */
  static async reportHealth(): Promise<SystemHealth> {
    const health = this.getHealth();

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'SYSTEM',
      family: FAMILY,
      severity: 'INFO',
      event: 'STEP_COMPLETE',
      message: `BrainSentinel health: mode=${health.mode}, active=${health.concurrentCount}, peak=${health.peakConcurrent}, total=${health.totalTasksThisSession}`,
      agent_id: AGENT_ID,
    });

    return health;
  }

  /** Get current system health snapshot. */
  static getHealth(): SystemHealth {
    return {
      mode: this.currentMode,
      activeAgents: [...this.activeAgents],
      concurrentCount: this.activeAgents.size,
      peakConcurrent: this.peakConcurrent,
      totalTasksThisSession: this.totalTasks,
      lastModeChange: this.modeChangedAt,
    };
  }

  static getCurrentMode(): BudgetMode { return this.currentMode; }
}
