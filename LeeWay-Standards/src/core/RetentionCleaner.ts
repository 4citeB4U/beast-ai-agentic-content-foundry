/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.REPORTS
TAG: AI.ORCHESTRATION.CORE.RETENTIONCLEANER.JANITOR

COLOR_ONION_HEX:
NEON=#10B981
FLUO=#34D399
PASTEL=#D1FAE5

ICON_ASCII:
family=lucide
glyph=trash-2

5WH:
WHAT = RetentionCleaner — rotation plan + compaction decisions for lean on-device reporting
WHY = Mobile devices cannot hold unlimited NDJSON logs; Janitor Sentinel needs a lean, auditable cleaner
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/RetentionCleaner.ts
WHEN = 2026
HOW = Computes what to rotate/delete/compact; delegates actual Z1 file ops to retention-janitor-mcp via Portal

AGENTS:
JANITOR_SENTINEL
ASSESS

LICENSE:
MIT
*/

// core/RetentionCleaner.ts
// Retention + rotation policy engine for Janitor Sentinel.
// Does NOT directly delete files (Z1 ops require MCP Portal).
// Produces a RotationPlan that Janitor Sentinel executes via Portal.

import { MemoryDB } from './MemoryDB';
import { ReportWriter } from './ReportWriter';
import { ReportIndex } from './ReportIndex';
import { eventBus } from './EventBus';

// ── Retention windows (milliseconds) ─────────────────────────
export const RETENTION_MS = {
  AGENT:          7  * 24 * 60 * 60 * 1000, // 7 days
  SYSTEM:         7  * 24 * 60 * 60 * 1000, // 7 days
  SITREP:         90 * 24 * 60 * 60 * 1000, // 90 days
  SECURITY_EVENT: 30 * 24 * 60 * 60 * 1000, // 30 days raw
  CHECKPOINT:     14 * 24 * 60 * 60 * 1000, // 14 days raw
  CLEANER_AUDIT:  30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

export const ROTATION_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const LOG_STORM_EVENTS_PER_MIN = 500;

export interface RotationAction {
  action: 'rotate' | 'delete' | 'compact';
  key: string;
  rotatedToKey?: string;
  reason: string;
  size_bytes?: number;
  event_count?: number;
}

export interface RetentionPlan {
  computed_at: string;
  mode: string;
  actions: RotationAction[];
  log_storm_detected: boolean;
  recommendation?: string;
}

// ── CleanerAudit ──────────────────────────────────────────────
const CLEANER_AUDIT_KEY = 'reports:maintenance/cleaner_runs.ndjson';

async function logCleanerRun(action: RotationAction, success: boolean): Promise<void> {
  await ReportWriter.governance(
    'report_coverage',
    action.action === 'rotate' ? 'RETENTION_ROTATE' : 'RETENTION_DELETE',
    'INFO',
    `[Janitor] ${action.action.toUpperCase()} ${action.key} — ${action.reason}`,
    { ...action, success, ts: new Date().toISOString() },
  );
}

// ── RetentionCleaner ──────────────────────────────────────────
class RetentionCleanerClass {
  /** Compute a retention plan from current IndexedDB buffers. */
  async computePlan(): Promise<RetentionPlan> {
    const manifest = await ReportIndex.getManifest();
    const actions: RotationAction[] = [];
    let logStorm = false;

    const now = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const fi of manifest.file_index) {
      const isAgent = fi.key.startsWith('reports:agents/');
      const isSystem = fi.key.startsWith('reports:system/runtime/');
      const isGov = fi.key.startsWith('reports:system/governance/');
      const isCheckpoint = fi.key.includes('checkpoints');

      // Check for log storm (events per key in buffer)
      if (fi.event_count > LOG_STORM_EVENTS_PER_MIN) {
        logStorm = true;
      }

      // Rotation by size
      if (fi.size_estimate_bytes > ROTATION_SIZE_BYTES) {
        const rotatedToKey = fi.key.replace('.ndjson', `.${dateStr}.ndjson`);
        actions.push({
          action: 'rotate',
          key: fi.key,
          rotatedToKey,
          reason: `size_exceeded_${Math.round(fi.size_estimate_bytes / 1024)}kb`,
          size_bytes: fi.size_estimate_bytes,
          event_count: fi.event_count,
        });
        continue;
      }

      // Daily rotation (check if last event was yesterday)
      if (fi.last_event_ts) {
        const lastDate = fi.last_event_ts.slice(0, 10);
        if (lastDate < dateStr && fi.event_count > 0) {
          const rotatedToKey = fi.key.replace('.ndjson', `.${lastDate}.ndjson`);
          actions.push({
            action: 'rotate',
            key: fi.key,
            rotatedToKey,
            reason: 'daily_boundary',
            event_count: fi.event_count,
          });
        }
      }

      // Deletion of old rotated keys (check retention)
      if (fi.key.match(/\.\d{4}-\d{2}-\d{2}\.ndjson$/)) {
        const datePart = fi.key.match(/(\d{4}-\d{2}-\d{2})\.ndjson$/)?.[1];
        if (datePart) {
          const fileDate = new Date(datePart).getTime();
          const window = isCheckpoint
            ? RETENTION_MS.CHECKPOINT
            : isGov
              ? RETENTION_MS.SECURITY_EVENT
              : isAgent
                ? RETENTION_MS.AGENT
                : RETENTION_MS.SYSTEM;
          if (now - fileDate > window) {
            actions.push({
              action: 'delete',
              key: fi.key,
              reason: `retention_expired_${Math.round((now - fileDate) / (24 * 60 * 60 * 1000))}d_old`,
            });
          }
        }
      }
    }

    return {
      computed_at: new Date().toISOString(),
      mode: logStorm ? 'LOG_STORM_DETECTED' : 'NORMAL',
      actions,
      log_storm_detected: logStorm,
      recommendation: logStorm
        ? 'Brain Sentinel: reduce active agents. Shield: throttle non-essential reporting.'
        : actions.length > 0
          ? 'Execute rotation/deletion plan via retention-janitor-mcp Portal.'
          : 'No action required.',
    };
  }

  /** Execute the in-memory parts of a plan (rotate IndexedDB buffers). */
  async executePlan(plan: RetentionPlan): Promise<void> {
    for (const action of plan.actions) {
      try {
        if (action.action === 'rotate' && action.rotatedToKey) {
          const events = await MemoryDB.get<unknown[]>(action.key) ?? [];
          // Archive rotated events
          const existing = await MemoryDB.get<unknown[]>(action.rotatedToKey) ?? [];
          await MemoryDB.set(action.rotatedToKey, [...existing, ...events]);
          // Clear current buffer
          await MemoryDB.set(action.key, []);
          await ReportIndex.recordRotation(action.key);
          await logCleanerRun(action, true);
          eventBus.emit('report:written', {
            key: CLEANER_AUDIT_KEY,
            event: {
              ts: new Date().toISOString(),
              report_class: 'GOVERNANCE' as const,
              family: 'SENTINEL' as const,
              severity: 'INFO' as const,
              event: 'RETENTION_ROTATE' as const,
              message: `Rotated ${action.key} → ${action.rotatedToKey}`,
            },
          });
        } else if (action.action === 'delete') {
          await MemoryDB.remove(action.key);
          await logCleanerRun(action, true);
          eventBus.emit('report:written', {
            key: CLEANER_AUDIT_KEY,
            event: {
              ts: new Date().toISOString(),
              report_class: 'GOVERNANCE' as const,
              family: 'SENTINEL' as const,
              severity: 'INFO' as const,
              event: 'RETENTION_DELETE' as const,
              message: `Deleted expired log ${action.key} (${action.reason})`,
            },
          });
        }
      } catch (err) {
        await logCleanerRun(action, false);
      }
    }

    await ReportIndex.recordCompaction();

    // Schedule next run (26 hours from now)
    const next = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
    await ReportIndex.scheduleJanitor(next);
  }

  /** Quick check: should Janitor Sentinel run now? */
  async shouldRun(): Promise<boolean> {
    const m = await ReportIndex.getManifest();
    if (!m.next_janitor_run) return true;
    return Date.now() > new Date(m.next_janitor_run).getTime();
  }

  /** Detect log storm (any family exceeded threshold). */
  async detectLogStorm(): Promise<boolean> {
    const m = await ReportIndex.getManifest();
    return m.file_index.some(fi => fi.event_count > LOG_STORM_EVENTS_PER_MIN);
  }
}

export const RetentionCleaner = new RetentionCleanerClass();
