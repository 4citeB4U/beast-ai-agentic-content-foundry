/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.NEXUS
TAG: SFU.NPC.RUNTIME_WATCHDOG
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=cpu
5WH:
  WHAT = NEXUS — Node Environment eXecution and Uptime Supervisor | Runtime Watchdog NPC
  WHY  = Monitors memory + CPU every 45s and alerts when thresholds are breached
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/nexus.ts
  WHEN = 2026
  HOW  = setInterval 45s → process.memoryUsage() + loadavg → agentBus.emit
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

/**
 * NEXUS — Network Exchange and Uptime Supervisor
 * Role: Runtime Watchdog
 * Directive: Monitor process health, memory, and uptime.
 *            Alert before a resource crisis occurs. Never interfere with runtime.
 */
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

export class NexusAgent implements IAgent {
  readonly codename = 'NEXUS';
  readonly agentId    = 'AGT-005';

  private status: AgentStatus = 'idle';
  private log: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private prevCpu = process.cpuUsage();

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this.addLog('info', 'NEXUS online — runtime oversight initialized.');
    this.timer = setInterval(() => this.tick(), 45_000);
    this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this.addLog('info', 'NEXUS offline.');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this.addLog('warn', 'NEXUS suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.addLog('info', 'NEXUS resumed — runtime oversight restored.');
    this.timer = setInterval(() => this.tick(), 45_000);
    this.tick();
  }

  private tick(): void {
    const mem = process.memoryUsage();
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const rssMB = Math.round(mem.rss / 1024 / 1024);
    const uptimeSec = Math.round(process.uptime());
    const uptimeMin = Math.round(uptimeSec / 60);

    const curCpu = process.cpuUsage(this.prevCpu);
    this.prevCpu = process.cpuUsage();
    const cpuUserMs = Math.round(curCpu.user / 1000);
    const cpuSysMs = Math.round(curCpu.system / 1000);

    this.agentMetrics = {
      heapUsedMB,
      heapTotalMB,
      heapPct: Math.round((heapUsedMB / heapTotalMB) * 100),
      rssMB,
      uptimeSec,
      uptimeMin,
      cpuUserMs,
      cpuSysMs,
    };

    let level: AgentEvent['level'] = 'info';
    if (heapUsedMB > 400) {
      this.status = 'alert';
      level = 'alert';
    } else if (heapUsedMB > 200) {
      this.status = 'active';
      level = 'warn';
    } else {
      this.status = 'active';
    }

    const msg = `Runtime: heap ${heapUsedMB}/${heapTotalMB}MB (${this.agentMetrics['heapPct']}%), RSS ${rssMB}MB, up ${uptimeMin}min, CPU u=${cpuUserMs}ms s=${cpuSysMs}ms`;
    this.emitEvent(level, msg);
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
      name: 'Network Exchange and Uptime Supervisor',
      codename: this.codename,
      role: 'Runtime Watchdog',
      status: this.status,
      directive: {
        primary: 'Monitor process health, memory, and uptime. Alert before a resource crisis occurs.',
        constraints: [
          'Warn at heap > 200MB. Alert and escalate at heap > 400MB.',
          'Never interfere with the process directly.',
          'Report absolute values and percentages together.',
        ],
      },
      governance: { agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'core', canTerminate: false, canAlert: true, canSuspendAgents: false, maxActionsPerMinute: 2, maxIdleMs: 0, tools: ['process.memoryUsage', 'process.cpuUsage', 'bus.emit'] },
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
