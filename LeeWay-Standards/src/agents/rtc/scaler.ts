/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.SCALER
TAG: SFU.NPC.AUTO_SCALER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=trending-up
5WH:
  WHAT = SCALER (AGT-008) — Scalable Compute Allocation & Load-balancing Edge Runtime
  WHY  = Monitors peer count + CPU against thresholds and issues scaling orders
         so the SFU can handle 1000s of concurrent users across countless apps
         while not wasting resources on edge devices during idle periods
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/scaler.ts
  WHEN = 2026
  HOW  = setInterval 45s → check rooms/peers/CPU → compare against capacity bands
         → issue ScalingOrder on bus → NEXUS and WARD adjust workers accordingly
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import os from 'os';
import { agentLogger } from '../logger.js';
import { getRooms } from '../mediasoup/room.js';
import { agentBus } from './bus.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent, ScalingOrder,
} from './types.js';

const log = agentLogger('SCALER');

// ─── Capacity thresholds ───────────────────────────────────────────────────────
const PEERS_PER_WORKER = 50;   // target peers per mediasoup worker
const CPU_EXPAND_PCT   = 75;   // expand workers above this CPU %
const CPU_SHRINK_PCT   = 20;   // shrink workers below this CPU %
const MIN_WORKERS      = 1;
const MAX_WORKERS      = os.cpus().length;

function cpuPct(): number {
  const avgs = os.loadavg();
  const cpus = os.cpus().length;
  return Math.min(100, Math.round(((avgs[0] ?? 0) / cpus) * 100));
}

export class ScalerAgent implements IAgent {
  readonly codename     = 'SCALER';
  readonly agentId      = 'AGT-008';

  private status: AgentStatus = 'idle';
  private agentLog: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private violationsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = {
    expandOrders: 0, shrinkOrders: 0, lastDecision: 'steady',
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private currentWorkers = os.cpus().length;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this._addLog('info', `SCALER online — monitoring capacity (max workers: ${MAX_WORKERS}).`);
    log.info({ maxWorkers: MAX_WORKERS }, 'SCALER agent online');
    this.timer = setInterval(() => this.tick(), 45_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this._addLog('info', 'SCALER offline.');
    log.info('SCALER agent offline');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this._addLog('warn', 'SCALER suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this._addLog('info', 'SCALER resumed — capacity monitoring restarted.');
    this.timer = setInterval(() => this.tick(), 45_000);
  }

  private tick(): void {
    const rooms = getRooms();
    const totalPeers = rooms.reduce((s, r) => s + r.getPeerCount(), 0);
    const cpu = cpuPct();
    const mem = process.memoryUsage();
    const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);

    // Determine needed workers from peer load
    const neededWorkers = Math.max(MIN_WORKERS, Math.min(MAX_WORKERS, Math.ceil(totalPeers / PEERS_PER_WORKER)));

    let action: ScalingOrder['action'] = 'steady';
    let workerDelta = 0;
    let reason = '';

    if (cpu > CPU_EXPAND_PCT && this.currentWorkers < MAX_WORKERS) {
      action = 'expand';
      workerDelta = 1;
      reason = `CPU ${cpu}% > threshold ${CPU_EXPAND_PCT}%`;
    } else if (neededWorkers > this.currentWorkers && this.currentWorkers < MAX_WORKERS) {
      action = 'expand';
      workerDelta = neededWorkers - this.currentWorkers;
      reason = `Peer load: ${totalPeers} peers needs ${neededWorkers} workers (current: ${this.currentWorkers})`;
    } else if (cpu < CPU_SHRINK_PCT && totalPeers === 0 && this.currentWorkers > MIN_WORKERS) {
      action = 'shrink';
      workerDelta = -1;
      reason = `Idle — CPU ${cpu}%, 0 peers`;
    }

    if (action !== 'steady') {
      this.currentWorkers = Math.max(MIN_WORKERS, Math.min(MAX_WORKERS, this.currentWorkers + workerDelta));
      const order: ScalingOrder = { type: 'scalingOrder', action, workerDelta, reason, ts: Date.now() };
      agentBus.emit('scalingOrder', order);
      log.info({ action, workerDelta, reason, currentWorkers: this.currentWorkers }, 'SCALER: scaling order issued');
      if (action === 'expand') this.agentMetrics['expandOrders'] = Number(this.agentMetrics['expandOrders']) + 1;
      else this.agentMetrics['shrinkOrders'] = Number(this.agentMetrics['shrinkOrders']) + 1;
    }

    this.agentMetrics['totalPeers'] = totalPeers;
    this.agentMetrics['totalRooms'] = rooms.length;
    this.agentMetrics['cpuPct'] = cpu;
    this.agentMetrics['heapPct'] = heapPct;
    this.agentMetrics['currentWorkers'] = this.currentWorkers;
    this.agentMetrics['lastDecision'] = action;

    this.status = action === 'steady' ? 'active' : 'active';
    const level: AgentEvent['level'] = action === 'steady' ? 'info' : 'warn';
    const msg = action === 'steady'
      ? `Steady — ${totalPeers} peers, ${rooms.length} rooms, CPU ${cpu}%, heap ${heapPct}%`
      : `Scaling ${action.toUpperCase()} Δ${workerDelta} worker(s) — ${reason}`;
    this.emitEvent(level, msg);
  }

  private emitEvent(level: AgentEvent['level'], msg: string): void {
    this.lastAction = msg;
    this.lastActionTs = Date.now();
    this.actionsTotal++;
    this._addLog(level, msg);
    log.info({ level, msg }, 'SCALER event');
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
      name: 'Scalable Compute Allocation & Load-balancing Edge Runtime',
      codename: this.codename,
      role: 'Auto-Scaler',
      status: this.status,
      directive: {
        primary: 'Monitor peer count and CPU load continuously. Issue scaling orders to keep the system responsive under any load while conserving resources on edge hardware.',
        constraints: [
          `Minimum workers: ${MIN_WORKERS}. Maximum workers: ${MAX_WORKERS} (all CPU cores).`,
          'Never expand beyond available CPU cores.',
          'Only shrink when both peer count is 0 AND CPU is below 20%.',
          'Issue scaling orders via the agent bus — never directly modify workers.',
          'Log every scaling decision with the triggering reason.',
        ],
      },
      governance: {
        agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'infrastructure',
        canTerminate: false, canAlert: true, canSuspendAgents: false,
        maxActionsPerMinute: 2, maxIdleMs: 300_000,
        tools: ['os.cpus', 'os.loadavg', 'rooms.list', 'bus.emit:scalingOrder'],
      },
      violationsTotal: this.violationsTotal,
      lastAction: this.lastAction, lastActionTs: this.lastActionTs,
      log: [...this.agentLog],
      metrics: { ...this.agentMetrics },
      startedAt: this.startedAt, actionsTotal: this.actionsTotal,
    };
  }
}
