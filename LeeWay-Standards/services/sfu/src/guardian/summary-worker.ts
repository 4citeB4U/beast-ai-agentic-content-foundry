/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SERVER.GUARDIAN.SUMMARY
TAG: GUARDIAN.SLOW-LANE.SUMMARY-WORKER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=file-text
5WH:
  WHAT = LeeWay Summary Worker — slow-lane aggregator
  WHY  = Keeps 10-30 second rolling summaries of system state for the dashboard log
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/guardian/summary-worker.ts
  WHEN = 2026
  HOW  = Consumes StatsBuffer.toCompactJSON() at summaryIntervalMs cadence.
         Builds a SystemBriefing plain object and emits it for agent consumption.
         No LLM calls — summaries are rule-derived.
AGENTS: NEXUS ARIA GOVERNOR
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import type { StatsBuffer, StatsSnapshot } from './stats-worker.js';
import { getModeConfig } from './runtime-mode.js';

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface SystemBriefing {
  /** ISO timestamp. */
  ts: string;
  /** Average peer health score 0-100. */
  avgHealth: number;
  /** Number of peers with score below threshold. */
  criticalPeers: number;
  /** Total connected peers. */
  totalPeers: number;
  /** Active runtime mode at time of summary. */
  mode: string;
  /** Concise bullet-point summary lines. */
  bullets: string[];
}

// ─── SummaryWorker ────────────────────────────────────────────────────────────
export class SummaryWorker {
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _lastBriefing: SystemBriefing | null = null;

  constructor(
    private readonly _buffer: StatsBuffer,
  ) {}

  start(): void {
    const cfg = getModeConfig();
    if (cfg.summaryIntervalMs <= 0) return; // Mode A — disabled
    this._timer = setInterval(() => void this._tick(), cfg.summaryIntervalMs);
  }

  stop(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  get lastBriefing(): SystemBriefing | null { return this._lastBriefing; }

  // ─── Tick ─────────────────────────────────────────────────────────────────
  private async _tick(): Promise<void> {
    const latest = this._buffer.latest();
    if (!latest) return;

    const briefing = this._buildBriefing(latest);
    this._lastBriefing = briefing;
  }

  // ─── Build briefing ───────────────────────────────────────────────────────
  private _buildBriefing(snapshot: StatsSnapshot): SystemBriefing {
    const cfg = getModeConfig();
    const bullets: string[] = [];

    if (snapshot.avgScore >= 90) {
      bullets.push('All peers nominal — no action required');
    } else if (snapshot.avgScore >= 70) {
      bullets.push(`Degraded quality detected — avg health ${Math.round(snapshot.avgScore)}`);
    } else {
      bullets.push(`SYSTEM DEGRADED — avg health ${Math.round(snapshot.avgScore)}, ${snapshot.criticalCount} critical peers`);
    }

    for (const peer of snapshot.peers) {
      if (peer.score < 70 && peer.flags.length > 0) {
        bullets.push(`${peer.peerId.slice(0, 8)}: ${peer.flags.slice(0, 2).join(', ')}`);
      }
    }

    return {
      ts:           new Date(snapshot.timestamp).toISOString(),
      avgHealth:    Math.round(snapshot.avgScore),
      criticalPeers: snapshot.criticalCount,
      totalPeers:   snapshot.peers.length,
      mode:         'agent-governed',
      bullets,
    };
  }
}
