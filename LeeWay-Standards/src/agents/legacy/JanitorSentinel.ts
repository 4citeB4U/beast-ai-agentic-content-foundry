/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.GOVERNANCE.JANITOR
TAG: AI.ORCHESTRATION.AGENT.JANITORSENTINEL.RETENTION

COLOR_ONION_HEX:
NEON=#EF4444
FLUO=#F87171
PASTEL=#FECACA

ICON_ASCII:
family=lucide
glyph=trash-2

5WH:
WHAT = Janitor Sentinel — Retention & Load Warden; keeps system_reports/ lean on a mobile device
WHY = Unchecked log growth crashes mobile devices; Janitor enforces size/time rotation and compaction
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/JanitorSentinel.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
SENTINEL

LICENSE:
MIT
*/

// agents/JanitorSentinel.ts
// Retention & Load Warden — rotates logs, compacts old data, detects log storms.
// Z1 file deletions are delegated to retention-janitor-mcp via a Portal Request.

import { RetentionCleaner, type RetentionPlan } from '../../core/RetentionCleaner';
import { ReportWriter } from '../../core/ReportWriter';
import { ReportIndex } from '../../core/ReportIndex';
import { eventBus } from '../../core/EventBus';
import { TaskGraph } from '../../core/TaskGraph';

const AGENT_ID = 'Janitor_Sentinel';
const FAMILY   = 'SENTINEL' as const;

export class JanitorSentinel {
  private static runTimer: ReturnType<typeof setInterval> | null = null;
  private static lastRunAt: string | null = null;

  /** Initialize: schedule a periodic retention check. */
  static initialize(tickMs = 26 * 60 * 60 * 1000 /* 26 hours */): void {
    // Listen for log storm events
    eventBus.on('brain:budget_changed', async ({ mode }) => {
      if (mode === 'BATTERY' || mode === 'SLEEP_CITY') {
        await this.quickCheck();
      }
    });

    // Schedule periodic run
    this.runTimer = setInterval(() => this.run(), tickMs);

    console.info('[JanitorSentinel] Retention monitoring active.');
  }

  /** Run the full retention cycle. */
  static async run(): Promise<RetentionPlan> {
    const plan = await RetentionCleaner.computePlan();

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: FAMILY,
      agent_id: AGENT_ID,
      severity: 'INFO',
      event: 'STEP_START',
      message: `[JanitorSentinel] Retention run started. Actions computed: ${plan.actions.length}. LogStorm: ${plan.log_storm_detected}`,
      data: { plan },
    });

    if (plan.log_storm_detected) {
      await this.handleLogStorm();
    }

    // Execute in-memory (IndexedDB) rotation
    await RetentionCleaner.executePlan(plan);

    // If any actions require Z1 file ops, emit a Portal Request event for MCP
    const z1Actions = plan.actions.filter(a => a.key.includes('system_reports'));
    if (z1Actions.length > 0) {
      eventBus.emit('report:written', {
        key: 'reports:system/governance/permissions.ndjson',
        event: {
          ts: new Date().toISOString(),
          report_class: 'GOVERNANCE' as const,
          family: FAMILY,
          agent_id: AGENT_ID,
          severity: 'INFO' as const,
          event: 'WRITE_INTENT_CREATED' as const,
          message: `[JanitorSentinel] Portal Request: ${z1Actions.length} Z1 file ops (rotate/delete) require retention-janitor-mcp.`,
          data: { z1Actions },
          next: 'Lee Prime should review and approve Portal via /lee.execute or permit grant.',
        },
      });
    }

    this.lastRunAt = new Date().toISOString();

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: FAMILY,
      agent_id: AGENT_ID,
      severity: 'INFO',
      event: 'STEP_COMPLETE',
      message: `[JanitorSentinel] Retention run complete. ${plan.actions.length} actions. Next: ${(await ReportIndex.getManifest()).next_janitor_run}`,
    });

    return plan;
  }

  /** Quick log storm check only. */
  static async quickCheck(): Promise<void> {
    const isStorm = await RetentionCleaner.detectLogStorm();
    if (isStorm) {
      await this.handleLogStorm();
    }
  }

  /** Handle a detected log storm: recommend throttles. */
  private static async handleLogStorm(): Promise<void> {
    await ReportWriter.system(
      'brain_sentinel',
      'LOG_STORM',
      'WARN',
      '[JanitorSentinel] LOG STORM detected. Recommending: reduce active agents + freeze non-essential reporting.',
      { triggered_by: AGENT_ID },
    );

    // Recommend Brain Sentinel mode degradation
    const budget = TaskGraph.getBudget();
    if (budget.maxActiveAgents > 2) {
      TaskGraph.setMode('BATTERY');
      eventBus.emit('brain:budget_changed', {
        mode: 'BATTERY',
        maxActiveAgents: 2,
        writePolicy: 'throttled',
      });
    }
  }

  /** Return status summary. */
  static async status(): Promise<{
    lastRunAt: string | null;
    nextRunAt: string | null;
    shouldRunNow: boolean;
  }> {
    const shouldRun = await RetentionCleaner.shouldRun();
    const m = await ReportIndex.getManifest();
    return {
      lastRunAt: this.lastRunAt,
      nextRunAt: m.next_janitor_run,
      shouldRunNow: shouldRun,
    };
  }

  /** Log boot. */
  static async boot(): Promise<void> {
    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: FAMILY,
      agent_id: AGENT_ID,
      severity: 'INFO',
      event: 'BOOT',
      message: '[JanitorSentinel] Retention & Load Warden initialized.',
    });
  }
}
