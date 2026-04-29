/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.REPAIR
TAG: SFU.NPC.AUTO_REPAIR
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=wrench
5WH:
  WHAT = REPAIR (AGT-006) — Rapid Error Processing & Automated Infrastructure Recovery
  WHY  = Watches for agents in alert/offline state and triggers auto-resume cycles
         so the system heals itself without operator intervention on edge hardware
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/repair.ts
  WHEN = 2026
  HOW  = setInterval 25s → scan all agent snapshots → if status=alert or offline
         and tier !== oversight → runtime.resume(); log repair ticket
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { agentLogger } from '../logger.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

const log = agentLogger('REPAIR');

export class RepairAgent implements IAgent {
  readonly codename     = 'REPAIR';
  readonly agentId      = 'AGT-006';

  private status: AgentStatus = 'idle';
  private agentLog: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private violationsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = { repairsTotal: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  // Lazy import to avoid circular at module load time
  private _getRuntime?: () => import('./runtime.js').AgentRuntime;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this._addLog('info', 'REPAIR online — auto-heal watchdog activated.');
    log.info('REPAIR agent online');
    this.timer = setInterval(() => void this.tick(), 25_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this._addLog('info', 'REPAIR offline.');
    log.info('REPAIR agent offline');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this._addLog('warn', 'REPAIR suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this._addLog('info', 'REPAIR resumed — watchdog restarted.');
    this.timer = setInterval(() => void this.tick(), 25_000);
  }

  /** Inject the runtime lazily to break circular dependency. */
  setRuntimeGetter(fn: () => import('./runtime.js').AgentRuntime): void {
    this._getRuntime = fn;
  }

  private async tick(): Promise<void> {
    if (!this._getRuntime) return;
    const runtime = this._getRuntime();
    const agents = runtime.getAllAgents();
    let repaired = 0;

    for (const agent of agents) {
      if (agent.codename === this.codename) continue;
      const snap: AgentSnapshot = agent.getSnapshot();
      if (snap.governance.tier === 'oversight') continue; // never auto-repair GOVERNOR
      if (snap.status === 'alert') {
        const msg = `Detected ${snap.codename} (${snap.agentId}) in ALERT state. Issuing resume.`;
        this._addLog('warn', msg);
        log.warn({ target: snap.codename }, 'REPAIR: resuming alert agent');
        runtime.resume(snap.codename, 'auto-heal by REPAIR agent');
        repaired++;
      } else if (snap.status === 'offline') {
        const msg = `Detected ${snap.codename} (${snap.agentId}) OFFLINE unexpectedly. Attempting restart.`;
        this._addLog('warn', msg);
        log.warn({ target: snap.codename }, 'REPAIR: restarting offline agent');
        agent.start(this.broadcastFn);
        repaired++;
      }
    }

    const total = Number(this.agentMetrics['repairsTotal']) + repaired;
    this.agentMetrics['repairsTotal'] = total;
    this.agentMetrics['lastScanTs'] = new Date().toISOString();

    const level: AgentEvent['level'] = repaired > 0 ? 'warn' : 'info';
    const msg = repaired > 0
      ? `Heal cycle complete — ${repaired} agent(s) repaired. Lifetime: ${total}`
      : `Scan nominal — all ${agents.length - 1} monitored agents healthy`;
    this.emitEvent(level, msg);
  }

  private emitEvent(level: AgentEvent['level'], msg: string): void {
    this.lastAction = msg;
    this.lastActionTs = Date.now();
    this.actionsTotal++;
    this._addLog(level, msg);
    log.info({ level, msg }, 'REPAIR event');
    this.broadcastFn({
      type: 'agentEvent', agentId: this.agentId, codename: this.codename,
      level, msg, ts: Date.now(), status: this.status,
      metrics: { ...this.agentMetrics },
    });
  }

  private _addLog(level: AgentLogEntry['level'], msg: string): void {
    this.agentLog = [...this.agentLog.slice(-49), { ts: Date.now(), level, msg }];
  }

  getSnapshot(): AgentSnapshot {
    return {
      agentId: this.agentId,
      name: 'Rapid Error Processing & Automated Infrastructure Recovery',
      codename: this.codename,
      role: 'Auto-Repair',
      status: this.status,
      directive: {
        primary: 'Detect unhealthy agents and restore them automatically. Keep the fleet operational without operator intervention.',
        constraints: [
          'Never repair an oversight-tier (GOVERNOR) agent autonomously.',
          'Log every repair ticket with target agent ID and reason.',
          'If an agent fails to restart twice in a row, escalate to GOVERNOR.',
          'Do not repair more than 3 agents per scan cycle.',
        ],
      },
      governance: {
        agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'infrastructure',
        canTerminate: false, canAlert: true, canSuspendAgents: false,
        maxActionsPerMinute: 4, maxIdleMs: 120_000,
        tools: ['runtime.resume', 'runtime.restart', 'bus.emit', 'governance.log'],
      },
      violationsTotal: this.violationsTotal,
      lastAction: this.lastAction, lastActionTs: this.lastActionTs,
      log: [...this.agentLog],
      metrics: { ...this.agentMetrics },
      startedAt: this.startedAt, actionsTotal: this.actionsTotal,
    };
  }
}
