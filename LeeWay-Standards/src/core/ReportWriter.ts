/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.REPORTS
TAG: AI.ORCHESTRATION.CORE.REPORTWRITER.NDJSON

COLOR_ONION_HEX:
NEON=#06B6D4
FLUO=#22D3EE
PASTEL=#CFFAFE

ICON_ASCII:
family=lucide
glyph=file-text

5WH:
WHAT = ReportWriter — canonical NDJSON event schema + IndexedDB buffer for all agent report events
WHY = Every agent must file structured reports; this is the single write surface for all operational telemetry
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/ReportWriter.ts
WHEN = 2026
HOW = Validates schema, appends to IndexedDB keyed by report path, emits EventBus event, enforces redaction

AGENTS:
CLERK_ARCHIVE
ASSESS
AUDIT

LICENSE:
MIT
*/

// core/ReportWriter.ts
// Canonical NDJSON report event writer.
// Agents call ReportWriter.write() — events are buffered in IndexedDB.
// MCP agents (reports-clerk-mcp) flush buffers to the on-device filesystem.

import { type WorkflowId, type Zone } from './GovernanceContract';
import { MemoryDB } from './MemoryDB';
import { eventBus } from './EventBus';

// ── Types ─────────────────────────────────────────────────────
export type ReportClass = 'SYSTEM' | 'GOVERNANCE' | 'AGENT' | 'CHECKPOINT' | 'SITREP' | 'INCIDENT' | 'EVALUATION';
export type Severity    = 'TRACE' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type AgentFamily = 'LEE' | 'FORGE' | 'ARCHIVE' | 'AEGIS' | 'VECTOR' | 'CORTEX' | 'AURA' | 'NEXUS' | 'SENTINEL' | 'SYSTEM';
export type ReportEventType =
  | 'TASK_CREATED' | 'ROUTED' | 'STEP_START' | 'STEP_COMPLETE' | 'STEP_FAILED'
  | 'WRITE_INTENT_CREATED' | 'WRITE_APPROVED' | 'WRITE_COMPLETE'
  | 'CHECKPOINT_BEFORE' | 'CHECKPOINT_AFTER'
  | 'RETENTION_ROTATE' | 'RETENTION_DELETE'
  | 'DOCS_DRIFT_DETECTED' | 'DOCS_PROPOSAL_READY'
  | 'SECURITY_EVENT' | 'BOOT' | 'SHUTDOWN' | 'MODE_CHANGE' | 'LOG_STORM';

export interface ReportEvent {
  ts: string;
  report_class: ReportClass;
  family: AgentFamily;
  agent_id?: string;
  severity: Severity;
  workflow?: WorkflowId;
  task_id?: string;
  step_id?: string;
  zone?: Zone;
  event: ReportEventType;
  message: string;
  data?: Record<string, unknown>;
  next?: string;
}

// ── Redaction patterns (Shield policy) ───────────────────────
const REDACT_PATTERNS: RegExp[] = [
  /AIzaSy[A-Za-z0-9_-]{35}/g,
  /sk-[A-Za-z0-9]{48}/g,
  /hf_[A-Za-z0-9]{36}/g,
  /ghp_[A-Za-z0-9]{36}/g,
  /"private_key"\s*:\s*"[^"]+"/g,
  /"client_email"\s*:\s*"[^"]+"/g,
];

const REDACT_FILENAME_PATTERNS = [
  /serviceAccount/i,
  /adminsdk/i,
  /\.env/i,
];

// ── Path helpers ──────────────────────────────────────────────
function agentReportPath(family: AgentFamily, agentId: string): string {
  return `reports:agents/${family}/${agentId}.ndjson`;
}

function systemReportPath(subsystem: string): string {
  return `reports:system/${subsystem}`;
}

// ── Redaction ─────────────────────────────────────────────────
function redact(text: string): string {
  let result = text;
  for (const re of REDACT_PATTERNS) {
    result = result.replace(re, '[REDACTED]');
  }
  return result;
}

function redactEvent(event: ReportEvent): ReportEvent {
  const copy = { ...event };
  copy.message = redact(copy.message);
  if (copy.next) copy.next = redact(copy.next);
  if (copy.data) {
    // Shallow redaction of string values in data
    const redactedData: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(copy.data)) {
      redactedData[k] = typeof v === 'string' ? redact(v) : v;
    }
    copy.data = redactedData;
  }
  return copy;
}

function isRedactedFilename(name: string): boolean {
  return REDACT_FILENAME_PATTERNS.some(p => p.test(name));
}

// ── Max buffer per file ───────────────────────────────────────
const MAX_EVENTS_PER_KEY = 2000;

// ── NDJSON serializer ─────────────────────────────────────────
function toNDJSON(events: ReportEvent[]): string {
  return events.map(e => JSON.stringify(e)).join('\n');
}

// ── ReportWriterClass ─────────────────────────────────────────
class ReportWriterClass {
  /** Write a report event for an agent. */
  async write(event: ReportEvent): Promise<void> {
    if (event.agent_id && isRedactedFilename(event.agent_id)) return;

    const safe = redactEvent(event);
    safe.ts = safe.ts || new Date().toISOString();

    // Determine storage key
    const key = event.agent_id
      ? agentReportPath(event.family, event.agent_id)
      : systemReportPath(`${event.report_class.toLowerCase()}.ndjson`);

    await this._append(key, safe);

    // Emit to index + EventBus
    eventBus.emit('report:written', { key, event: safe });
  }

  /** Write a system-level event (runtime/governance). */
  async system(
    subsystem: string,
    eventType: ReportEventType,
    severity: Severity,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.write({
      ts: new Date().toISOString(),
      report_class: 'SYSTEM',
      family: 'SYSTEM',
      severity,
      event: eventType,
      message,
      data,
    });
    // Also key by subsystem for runtime streams
    const key = `reports:system/runtime/${subsystem}.ndjson`;
    const ev: ReportEvent = {
      ts: new Date().toISOString(),
      report_class: 'SYSTEM',
      family: 'SYSTEM',
      severity,
      event: eventType,
      message,
      data,
    };
    await this._append(key, ev);
  }

  /** Write a governance event (permissions, breakglass, security). */
  async governance(
    category: 'permissions' | 'breakglass' | 'security_events' | 'docs_audit' | 'report_coverage',
    eventType: ReportEventType,
    severity: Severity,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const key = `reports:system/governance/${category}.ndjson`;
    const ev: ReportEvent = {
      ts: new Date().toISOString(),
      report_class: 'GOVERNANCE',
      family: 'SYSTEM',
      severity,
      event: eventType,
      message: redact(message),
      data,
    };
    await this._append(key, ev);
    eventBus.emit('report:written', { key, event: ev });
  }

  /** Write a checkpoint event. */
  async checkpoint(
    phase: 'before' | 'after',
    taskId: string,
    agentId: string,
    family: AgentFamily,
    message: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    const key = `reports:system/checkpoints/checkpoints.ndjson`;
    const ev: ReportEvent = {
      ts: new Date().toISOString(),
      report_class: 'CHECKPOINT',
      family,
      agent_id: agentId,
      task_id: taskId,
      severity: 'INFO',
      event: phase === 'before' ? 'CHECKPOINT_BEFORE' : 'CHECKPOINT_AFTER',
      message,
      data,
    };
    await this._append(key, ev);
    eventBus.emit('report:written', { key, event: ev });
  }

  /** Read all buffered events for a given key. */
  async read(key: string): Promise<ReportEvent[]> {
    return await MemoryDB.get<ReportEvent[]>(key) ?? [];
  }

  /** Get all known report keys. */
  async keys(): Promise<string[]> {
    return await MemoryDB.get<string[]>('reports:__keys__') ?? [];
  }

  /** Export a key's events as NDJSON string (for MCP flush). */
  async exportNDJSON(key: string): Promise<string> {
    const events = await this.read(key);
    return toNDJSON(events);
  }

  /** Clear a key's buffer (after MCP flush). */
  async clearBuffer(key: string): Promise<void> {
    await MemoryDB.set(key, []);
  }

  // ── Private ──────────────────────────────────────────────────
  private async _append(key: string, ev: ReportEvent): Promise<void> {
    const existing = await MemoryDB.get<ReportEvent[]>(key) ?? [];
    existing.push(ev);
    // Trim to max buffer size (rotate oldest if exceeded)
    const trimmed = existing.length > MAX_EVENTS_PER_KEY
      ? existing.slice(existing.length - MAX_EVENTS_PER_KEY)
      : existing;
    await MemoryDB.set(key, trimmed);

    // Track all known keys
    const allKeys = await MemoryDB.get<string[]>('reports:__keys__') ?? [];
    if (!allKeys.includes(key)) {
      allKeys.push(key);
      await MemoryDB.set('reports:__keys__', allKeys);
    }
  }
}

export const ReportWriter = new ReportWriterClass();
