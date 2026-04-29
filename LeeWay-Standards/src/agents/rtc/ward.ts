/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.WARD
TAG: SFU.NPC.ROOM_JANITOR
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=trash-2
5WH:
  WHAT = WARD — Watchful Agent for Room Disposal | Room Janitor NPC
  WHY  = Sweeps empty SFU rooms every 60s to prevent memory leaks
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/ward.ts
  WHEN = 2026
  HOW  = setInterval 60s → getRooms() filter empty → deleteRoom() → agentBus.emit
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

/**
 * WARD — Watchful Agent for Room Disposal
 * Role: Room Janitor
 * Directive: Identify and reclaim abandoned rooms. Keep the room registry clean.
 *            Never terminate a room that has active peers.
 */
import { getRooms, deleteRoom } from '../mediasoup/room.js';
import { logger } from '../logger.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

export class WardAgent implements IAgent {
  readonly codename = 'WARD';
  readonly agentId    = 'AGT-003';

  private status: AgentStatus = 'idle';
  private log: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = { roomsCleaned: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this.addLog('info', 'WARD online — room maintenance sweep initialized.');
    this.timer = setInterval(() => this.tick(), 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this.addLog('info', 'WARD offline — sweep suspended.');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this.addLog('warn', 'WARD suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.addLog('info', 'WARD resumed — sweep restarted.');
    this.timer = setInterval(() => this.tick(), 60_000);
  }

  private tick(): void {
    const rooms = getRooms();
    const before = rooms.length;
    let cleaned = 0;

    for (const room of rooms) {
      if (room.getPeerCount() === 0) {
        try {
          deleteRoom(room.id);
          cleaned++;
          logger.info({ roomId: room.id, agent: 'WARD' }, 'Empty room reclaimed');
        } catch (err) {
          logger.warn({ roomId: room.id, err }, '[WARD] Failed to reclaim room');
        }
      }
    }

    const total = Number(this.agentMetrics['roomsCleaned']) + cleaned;
    this.agentMetrics['roomsCleaned'] = total;
    this.agentMetrics['lastSweepTs'] = new Date().toISOString();
    this.agentMetrics['roomsBeforeSweep'] = before;
    this.agentMetrics['clearedThisSweep'] = cleaned;

    const level: AgentEvent['level'] = cleaned > 0 ? 'warn' : 'info';
    const msg = cleaned > 0
      ? `Sweep complete — reclaimed ${cleaned} empty room(s). Lifetime total: ${total}`
      : `Sweep complete — no empty rooms found (${before} active)`;
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
      name: 'Watchful Agent for Room Disposal',
      codename: this.codename,
      role: 'Room Janitor',
      status: this.status,
      directive: {
        primary: 'Identify and reclaim abandoned rooms. Keep the room registry clean.',
        constraints: [
          'Never terminate a room with active peers.',
          'Log every room closure with roomId.',
          'Run sweep no more than once per minute.',
        ],
      },
      governance: { agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'core', canTerminate: true, canAlert: true, canSuspendAgents: false, maxActionsPerMinute: 1, maxIdleMs: 0, tools: ['rooms.list', 'rooms.delete', 'bus.emit'] },
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
