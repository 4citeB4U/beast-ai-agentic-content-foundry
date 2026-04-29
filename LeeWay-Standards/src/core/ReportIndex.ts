/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.REPORTS
TAG: AI.ORCHESTRATION.CORE.REPORTINDEX.MANIFEST

COLOR_ONION_HEX:
NEON=#F59E0B
FLUO=#FBBF24
PASTEL=#FDE68A

ICON_ASCII:
family=lucide
glyph=list

5WH:
WHAT = ReportIndex — maintains manifest.json and latest.ndjson global report indexes
WHY = Provides fast situational-awareness lookup without scanning all NDJSON files
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/ReportIndex.ts
WHEN = 2026
HOW = Updates rolling manifest in IndexedDB; appends to latest.ndjson stream; consumed by Clerk Archive + Lee Prime

AGENTS:
CLERK_ARCHIVE
ASSESS

LICENSE:
MIT
*/

// core/ReportIndex.ts
// Global index: manifest.json (rolling summary) + latest.ndjson (recent event stream).
// Clerk Archive calls this whenever a report event is written.

import { type ReportEvent, type AgentFamily, type ReportClass, type Severity } from './ReportWriter';
import { MemoryDB } from './MemoryDB';

const MANIFEST_KEY = 'reports:_index:manifest';
const LATEST_KEY   = 'reports:_index:latest';
const LATEST_MAX   = 500; // keep last 500 events in latest stream

// ── Manifest shape ────────────────────────────────────────────
export interface ReportManifest {
  generated_at: string;
  schema_version: '1.0.0';
  total_events: number;
  agents_reporting: string[];
  agents_silent: string[];
  by_class: Record<ReportClass, number>;
  by_family: Record<AgentFamily, number>;
  by_severity: Record<Severity, number>;
  file_index: Array<{
    key: string;
    family: AgentFamily;
    agent_id?: string;
    event_count: number;
    last_event_ts: string;
    size_estimate_bytes: number;
  }>;
  last_rotation: string | null;
  last_compaction: string | null;
  next_janitor_run: string | null;
}

function emptyManifest(): ReportManifest {
  return {
    generated_at: new Date().toISOString(),
    schema_version: '1.0.0',
    total_events: 0,
    agents_reporting: [],
    agents_silent: [],
    by_class: {
      SYSTEM: 0, GOVERNANCE: 0, AGENT: 0,
      CHECKPOINT: 0, SITREP: 0, INCIDENT: 0, EVALUATION: 0,
    },
    by_family: {
      LEE: 0, FORGE: 0, ARCHIVE: 0, AEGIS: 0, VECTOR: 0,
      CORTEX: 0, AURA: 0, NEXUS: 0, SENTINEL: 0, SYSTEM: 0,
    },
    by_severity: { TRACE: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 },
    file_index: [],
    last_rotation: null,
    last_compaction: null,
    next_janitor_run: null,
  };
}

// ── ReportIndex ───────────────────────────────────────────────
class ReportIndexClass {
  /** Update the manifest and latest stream with a new event. */
  async ingest(key: string, event: ReportEvent): Promise<void> {
    const manifest = await this.getManifest();

    // Update counters
    manifest.total_events++;
    manifest.by_class[event.report_class] = (manifest.by_class[event.report_class] ?? 0) + 1;
    manifest.by_family[event.family] = (manifest.by_family[event.family] ?? 0) + 1;
    manifest.by_severity[event.severity] = (manifest.by_severity[event.severity] ?? 0) + 1;
    manifest.generated_at = new Date().toISOString();

    // Track reporting agents
    if (event.agent_id && !manifest.agents_reporting.includes(event.agent_id)) {
      manifest.agents_reporting.push(event.agent_id);
    }

    // Update file index
    const fi = manifest.file_index.find(f => f.key === key);
    if (fi) {
      fi.event_count++;
      fi.last_event_ts = event.ts;
      fi.size_estimate_bytes += JSON.stringify(event).length + 1;
    } else {
      manifest.file_index.push({
        key,
        family: event.family,
        agent_id: event.agent_id,
        event_count: 1,
        last_event_ts: event.ts,
        size_estimate_bytes: JSON.stringify(event).length + 1,
      });
    }

    await MemoryDB.set(MANIFEST_KEY, manifest);

    // Append to latest stream
    const latest = await MemoryDB.get<ReportEvent[]>(LATEST_KEY) ?? [];
    latest.push(event);
    const trimmed = latest.length > LATEST_MAX ? latest.slice(-LATEST_MAX) : latest;
    await MemoryDB.set(LATEST_KEY, trimmed);
  }

  /** Get the current manifest. */
  async getManifest(): Promise<ReportManifest> {
    return await MemoryDB.get<ReportManifest>(MANIFEST_KEY) ?? emptyManifest();
  }

  /** Get the latest N events from the stream. */
  async getLatest(n: number = 50): Promise<ReportEvent[]> {
    const all = await MemoryDB.get<ReportEvent[]>(LATEST_KEY) ?? [];
    return all.slice(-n).reverse(); // most recent first
  }

  /** Set last rotation/compaction timestamps. */
  async recordRotation(key: string): Promise<void> {
    const m = await this.getManifest();
    m.last_rotation = new Date().toISOString();
    const fi = m.file_index.find(f => f.key === key);
    if (fi) {
      fi.event_count = 0;
      fi.size_estimate_bytes = 0;
    }
    await MemoryDB.set(MANIFEST_KEY, m);
  }

  async recordCompaction(): Promise<void> {
    const m = await this.getManifest();
    m.last_compaction = new Date().toISOString();
    await MemoryDB.set(MANIFEST_KEY, m);
  }

  /** Schedule next Janitor run. */
  async scheduleJanitor(atIso: string): Promise<void> {
    const m = await this.getManifest();
    m.next_janitor_run = atIso;
    await MemoryDB.set(MANIFEST_KEY, m);
  }

  /** Summarize for /lee.status and /lee.sitrep. */
  async summary(): Promise<{
    total: number;
    classes: Record<string, number>;
    families: Record<string, number>;
    topSeverity: string;
    agents: number;
    recentEvents: ReportEvent[];
  }> {
    const m = await this.getManifest();
    const topSev = (Object.entries(m.by_severity) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'INFO';
    return {
      total: m.total_events,
      classes: m.by_class as unknown as Record<string, number>,
      families: m.by_family as unknown as Record<string, number>,
      topSeverity: topSev,
      agents: m.agents_reporting.length,
      recentEvents: await this.getLatest(5),
    };
  }
}

export const ReportIndex = new ReportIndexClass();
