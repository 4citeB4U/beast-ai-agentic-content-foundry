/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.GOVERNANCE.CLERK
TAG: AI.ORCHESTRATION.AGENT.CLERKARCHIVE.REPORTS

COLOR_ONION_HEX:
NEON=#F59E0B
FLUO=#FBBF24
PASTEL=#FDE68A

ICON_ASCII:
family=lucide
glyph=archive

5WH:
WHAT = Clerk Archive — Keeper of Reports; validates schema, routes to correct family path, maintains global index
WHY = Without a clerk, agents skip reporting or use wrong paths; this enforces the reporting contract
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/ClerkArchive.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
ARCHIVE

LICENSE:
MIT
*/

// agents/ClerkArchive.ts
// Keeper of Reports — validates every report event; updates global index; tracks coverage gaps.

import { ReportWriter, type ReportEvent, type ReportEventType } from '../../core/ReportWriter';
import { ReportIndex } from '../../core/ReportIndex';
import { eventBus } from '../../core/EventBus';

const AGENT_ID = 'Clerk_Archive';
const FAMILY   = 'ARCHIVE' as const;

// Required fields for a valid report event
const REQUIRED_FIELDS: Array<keyof ReportEvent> = ['ts', 'report_class', 'family', 'severity', 'event', 'message'];

// Known allowed values
const VALID_CLASSES   = new Set(['SYSTEM', 'GOVERNANCE', 'AGENT', 'CHECKPOINT', 'SITREP', 'INCIDENT', 'EVALUATION']);
const VALID_SEVERITIES = new Set(['TRACE', 'INFO', 'WARN', 'ERROR', 'CRITICAL']);
const VALID_EVENTS: Set<ReportEventType> = new Set([
  'TASK_CREATED', 'ROUTED', 'STEP_START', 'STEP_COMPLETE', 'STEP_FAILED',
  'WRITE_INTENT_CREATED', 'WRITE_APPROVED', 'WRITE_COMPLETE',
  'CHECKPOINT_BEFORE', 'CHECKPOINT_AFTER',
  'RETENTION_ROTATE', 'RETENTION_DELETE',
  'DOCS_DRIFT_DETECTED', 'DOCS_PROPOSAL_READY',
  'SECURITY_EVENT', 'BOOT', 'SHUTDOWN', 'MODE_CHANGE', 'LOG_STORM',
]);

export interface CoverageReport {
  generated_at: string;
  total_reporting: number;
  total_silent: number;
  agents_reporting: string[];
  agents_silent: string[];
  validation_errors: Array<{ key: string; reason: string }>;
  recommendation: string;
}

export class ClerkArchive {
  private static initialized = false;
  private static validationErrors: Array<{ key: string; reason: string }> = [];

  /** Initialize: subscribe to report:written events and validate + index them. */
  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    eventBus.on('report:written', async ({ key, event }) => {
      await this.processEvent(key, event);
    });

    console.info('[ClerkArchive] Report governance active.');
  }

  /** Validate a report event against schema. Returns null if valid, error string if invalid. */
  static validate(event: ReportEvent): string | null {
    for (const field of REQUIRED_FIELDS) {
      if (!event[field]) return `Missing required field: ${field}`;
    }
    if (!VALID_CLASSES.has(event.report_class)) return `Invalid report_class: ${event.report_class}`;
    if (!VALID_SEVERITIES.has(event.severity)) return `Invalid severity: ${event.severity}`;
    if (!VALID_EVENTS.has(event.event)) return `Invalid event type: ${event.event}`;
    if (!event.ts.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) return `Invalid ts format: ${event.ts}`;
    return null;
  }

  /** Process an incoming report event: validate → index → audit. */
  static async processEvent(key: string, event: ReportEvent): Promise<void> {
    const err = this.validate(event);
    if (err) {
      this.validationErrors.push({ key, reason: err });
      await ReportWriter.governance(
        'report_coverage',
        'SECURITY_EVENT',
        'WARN',
        `[ClerkArchive] Schema violation from ${event.agent_id ?? 'unknown'}: ${err}`,
        { key, event },
      );
      return;
    }

    // Update the global index
    await ReportIndex.ingest(key, event);
  }

  /** Generate a coverage report (which agents reported in the last N hours). */
  static async coverageReport(windowHours = 24): Promise<CoverageReport> {
    const manifest = await ReportIndex.getManifest();
    const windowMs = windowHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - windowMs).toISOString();

    const reporting = manifest.file_index
      .filter(fi => fi.last_event_ts > cutoff && fi.agent_id)
      .map(fi => fi.agent_id!);

    const report: CoverageReport = {
      generated_at: new Date().toISOString(),
      total_reporting: reporting.length,
      total_silent: manifest.agents_silent.length,
      agents_reporting: reporting,
      agents_silent: manifest.agents_silent,
      validation_errors: [...this.validationErrors],
      recommendation: reporting.length === 0
        ? 'ALERT: No agents have reported in the last 24 hours. Check system health.'
        : this.validationErrors.length > 0
          ? `${this.validationErrors.length} schema violations detected. Review report_coverage.ndjson.`
          : 'Coverage nominal.',
    };

    // Write the coverage report
    await ReportWriter.governance(
      'report_coverage',
      'STEP_COMPLETE',
      'INFO',
      `[ClerkArchive] Coverage report: ${reporting.length} agents reporting, ${manifest.agents_silent.length} silent`,
      { ...report },
    );

    return report;
  }

  /** Generate a daily summary using leeway (for SITREP contribution). */
  static async generateDailySummary(): Promise<string> {
    const summary = await ReportIndex.summary();
    return `Report coverage: ${summary.agents} agents active, ${summary.total} total events, top severity ${summary.topSeverity}, recent events ${summary.recentEvents.slice(0, 3).map(event => event.event).join(', ') || 'none'}.`;
  }

  /** Log Clerk Archive's own boot event. */
  static async boot(): Promise<void> {
    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: FAMILY,
      agent_id: AGENT_ID,
      severity: 'INFO',
      event: 'BOOT',
      message: '[ClerkArchive] Keeper of Reports initialized. Report governance active.',
    });
  }
}

