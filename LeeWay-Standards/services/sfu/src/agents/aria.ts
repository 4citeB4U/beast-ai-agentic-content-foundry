/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.ARIA
TAG: SFU.NPC.HEALTH_MONITOR
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=heart-pulse
5WH:
  WHAT = ARIA — Adaptive RTC Infrastructure Agent | Health Monitor NPC
  WHY  = Continuously pings /health endpoint and broadcasts anomalies to all clients
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/aria.ts
  WHEN = 2026
  HOW  = setInterval 30s → HTTP GET /health → agentBus.emit('agentEvent')
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

/**
 * ARIA — Adaptive RTC Infrastructure Agent
 * Role: Health Monitor
 * Directive: Maintain constant uptime visibility. Report any deviation from
 *            baseline. Never suppress a failure streak ≥ 2.
 */
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

export class AriaAgent implements IAgent {
  readonly codename = 'ARIA';
  readonly agentId    = 'AGT-001';

  private status: AgentStatus = 'idle';
  private log: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = { checksTotal: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private failStreak = 0;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this.addLog('info', 'ARIA online — beginning uptime surveillance.');
    this.timer = setInterval(() => void this.tick(), 30_000);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this.addLog('info', 'ARIA offline — surveillance suspended.');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this.addLog('warn', 'ARIA suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.addLog('info', 'ARIA resumed — surveillance restarted.');
    this.timer = setInterval(() => void this.tick(), 30_000);
    void this.tick();
  }

  private async tick(): Promise<void> {
    const port = process.env['HTTP_PORT'] ?? '3000';
    const t0 = Date.now();
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      const latency = Date.now() - t0;
      this.failStreak = 0;
      this.status = 'active';
      this.agentMetrics['healthLatencyMs'] = latency;
      this.agentMetrics['httpStatus'] = res.status;
      this.agentMetrics['checksTotal'] = Number(this.agentMetrics['checksTotal']) + 1;
      this.emitEvent('info', `Health OK — HTTP ${res.status} in ${latency}ms`);
    } catch (err) {
      this.failStreak++;
      this.status = this.failStreak >= 2 ? 'alert' : 'active';
      this.agentMetrics['failStreak'] = this.failStreak;
      const level: AgentEvent['level'] = this.failStreak >= 2 ? 'alert' : 'warn';
      this.emitEvent(level, `Health check failed (streak: ${this.failStreak}) — ${(err as Error).message}`);
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
      name: 'Adaptive RTC Infrastructure Agent',
      codename: this.codename,
      role: 'Health Monitor',
      status: this.status,
      directive: {
        primary: 'Maintain constant uptime visibility. Report any deviation from baseline without false positives.',
        constraints: [
          'Wait for two consecutive failures before raising an alert.',
          'Always include latency in health reports.',
          'Never suppress a failure streak ≥ 2.',
        ],
      },
      governance: { agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'core', canTerminate: false, canAlert: true, canSuspendAgents: false, maxActionsPerMinute: 4, maxIdleMs: 0, tools: ['http.get:/health', 'bus.emit'] },
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
