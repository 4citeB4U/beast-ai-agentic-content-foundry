/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.VECTOR
TAG: SFU.NPC.METRICS_ANALYST
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=bar-chart-3
5WH:
  WHAT = VECTOR — Vital Engine for Collecting and Tracking Operational Records
  WHY  = Polls Prometheus metrics every 15s and surfaces anomalies to all clients
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/vector.ts
  WHEN = 2026
  HOW  = setInterval 15s → GET /metrics → parse Prometheus text → agentBus.emit
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

/**
 * VECTOR — Vital Engine for Collecting and Tracking Operational Records
 * Role: Metrics Analyst
 * Directive: Collect all observable signals. Build a telemetry history.
 *            Surface anomalies before they become incidents.
 */
import { registry } from '../metrics.js';
import { getRooms } from '../mediasoup/room.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

export class VectorAgent implements IAgent {
  readonly codename = 'VECTOR';
  readonly agentId    = 'AGT-002';

  private status: AgentStatus = 'idle';
  private log: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private prevSigErrors = 0;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this.addLog('info', 'VECTOR online — telemetry collection started.');
    this.timer = setInterval(() => void this.tick(), 15_000);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this.addLog('info', 'VECTOR offline — telemetry suspended.');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this.addLog('warn', 'VECTOR suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.addLog('info', 'VECTOR resumed — telemetry restarted.');
    this.timer = setInterval(() => void this.tick(), 15_000);
    void this.tick();
  }

  private async tick(): Promise<void> {
    try {
      const metricsJson = await registry.getMetricsAsJSON();
      const snap: Record<string, number | string> = {};

      for (const metric of metricsJson) {
        if (!metric.values?.length) continue;
        if ((metric.type as unknown as string) === 'gauge' || (metric.type as unknown as string) === 'counter') {
          for (const v of metric.values) {
            const labelStr = Object.entries(v.labels ?? {})
              .map(([k, val]) => `${k}="${val}"`)
              .join(',');
            const key = labelStr ? `${metric.name}{${labelStr}}` : metric.name;
            snap[key] = Math.round(v.value * 100) / 100;
          }
        }
      }

      // In-process room inspection
      const rooms = getRooms();
      let totalPeers = 0;
      let emptyRooms = 0;
      for (const room of rooms) {
        const c = room.getPeerCount();
        totalPeers += c;
        if (c === 0) emptyRooms++;
      }
      snap['rooms_active'] = rooms.length;
      snap['peers_total'] = totalPeers;
      snap['rooms_empty'] = emptyRooms;
      snap['snapshotTs'] = new Date().toISOString();

      this.agentMetrics = snap;

      // Detect signaling error spike
      const currentErrors = Number(snap['leeway_signaling_errors_total'] ?? 0);
      const delta = currentErrors - this.prevSigErrors;
      this.prevSigErrors = currentErrors;
      this.status = 'active';

      let level: AgentEvent['level'] = 'info';
      if (delta > 5) { level = 'warn'; this.status = 'alert'; }

      const msg = `Snapshot: ${rooms.length} rooms, ${totalPeers} peers, ${emptyRooms} empty, Δerr=${delta}`;
      this.emitEvent(level, msg);
    } catch (err) {
      this.status = 'alert';
      this.emitEvent('alert', `Telemetry error: ${(err as Error).message}`);
    }
  }

  private emitEvent(level: AgentEvent['level'], msg: string): void {
    this.lastAction = msg;
    this.lastActionTs = Date.now();
    this.actionsTotal++;
    this.addLog(level, msg);
    this.broadcastFn({
      type: 'agentEvent', agentId: this.agentId, codename: this.codename,
      level, msg, ts: Date.now(), status: this.status,
      metrics: { ...this.agentMetrics },
    });
  }

  private addLog(level: AgentLogEntry['level'], msg: string): void {
    this.log = [...this.log.slice(-49), { ts: Date.now(), level, msg }];
  }

  getSnapshot(): AgentSnapshot {
    return {
      agentId: this.agentId,
      name: 'Vital Engine for Collecting and Tracking Operational Records',
      codename: this.codename,
      role: 'Metrics Analyst',
      status: this.status,
      directive: {
        primary: 'Collect all observable signals. Build telemetry history. Surface anomalies before they escalate.',
        constraints: [
          'Poll at most once every 15 seconds.',
          'Never modify the metrics it observes.',
          'Alert if signaling error rate increases by more than 5 in a single interval.',
        ],
      },
      governance: { agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'core', canTerminate: false, canAlert: true, canSuspendAgents: false, maxActionsPerMinute: 6, maxIdleMs: 0, tools: ['metrics.read', 'rooms.inspect', 'bus.emit'] },
      violationsTotal: 0,
      lastAction: this.lastAction,
      lastActionTs: this.lastActionTs,
      log: [...this.log],
      metrics: { ...this.agentMetrics },
      startedAt: this.startedAt,
      actionsTotal: this.actionsTotal,
    };
  }
}
