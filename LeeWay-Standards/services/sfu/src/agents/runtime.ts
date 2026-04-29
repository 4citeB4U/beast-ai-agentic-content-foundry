/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.RUNTIME
TAG: SFU.AGENT.RUNTIME_MANAGER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=cpu
5WH:
  WHAT = LeeWay Agent Runtime — single-process manager for all 8 agents
  WHY  = Ensures only ONE instance of each agent runs, prevents battery drain
         on edge devices by suspending idle agents, and enforces governance
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/runtime.ts
  WHEN = 2026
  HOW  = Singleton class; agents register on startup; idle watchdog suspends
         non-core agents that haven't acted in maxIdleMs; GOVERNOR gets audit
         stream; trace IDs on every action for distributed tracing
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { logger } from '../logger.js';
import { auditLog } from './governance.js';
import type { IAgent, BroadcastFn, AgentStatus } from './types.js';

// ─── Idle watchdog interval ────────────────────────────────────────────────────
const IDLE_CHECK_MS = 30_000;

/** Single shared runtime — all agents live inside this Node.js process. */
export class AgentRuntime {
  private static _instance: AgentRuntime | null = null;
  private readonly registry = new Map<string, IAgent>();
  private broadcastFn: BroadcastFn | null = null;
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  private constructor() {}

  static getInstance(): AgentRuntime {
    if (!AgentRuntime._instance) {
      AgentRuntime._instance = new AgentRuntime();
    }
    return AgentRuntime._instance;
  }

  /** Called once during server boot — provides the bus broadcast function. */
  setBroadcast(fn: BroadcastFn): void {
    this.broadcastFn = fn;
  }

  /** Register an agent. Throws if the same codename is registered twice. */
  register(agent: IAgent): void {
    if (this.registry.has(agent.codename)) {
      throw new Error(
        `[AgentRuntime] Duplicate agent registration rejected: ${agent.codename} (${agent.agentId}). ` +
        'Only one instance of each agent may run in the process.',
      );
    }
    this.registry.set(agent.codename, agent);
    logger.info({ codename: agent.codename, agentId: agent.agentId }, 'Agent registered with runtime');
  }

  /** Start all registered agents and begin the idle watchdog. */
  startAll(): void {
    if (!this.broadcastFn) throw new Error('[AgentRuntime] broadcastFn not set before startAll()');
    for (const agent of this.registry.values()) {
      agent.start(this.broadcastFn);
      auditLog(agent.codename, agent.agentId, 'started');
      logger.info({ codename: agent.codename, agentId: agent.agentId }, 'Agent started');
    }
    logger.info({ count: this.registry.size }, 'All LeeWay agents online');
    this._startIdleWatchdog();
  }

  /** Gracefully stop all agents (called on SIGTERM/SIGINT). */
  stopAll(): void {
    if (this.idleTimer) clearInterval(this.idleTimer);
    for (const agent of this.registry.values()) {
      agent.stop();
      auditLog(agent.codename, agent.agentId, 'stopped');
    }
    logger.info('All agents offline — runtime shut down');
  }

  /** Suspend a specific agent (GOVERNOR directive). */
  suspend(codename: string, reason: string): boolean {
    const agent = this.registry.get(codename.toUpperCase());
    if (!agent) return false;
    const gov = agent.getSnapshot().governance;
    if (gov.tier === 'oversight') {
      logger.warn({ codename }, 'Cannot suspend oversight-tier agent');
      return false;
    }
    agent.suspend();
    auditLog(codename, agent.agentId, 'suspended', { reason });
    logger.warn({ codename, reason }, 'Agent suspended by runtime directive');
    return true;
  }

  /** Resume a previously-suspended agent. */
  resume(codename: string, reason: string): boolean {
    const agent = this.registry.get(codename.toUpperCase());
    if (!agent || !this.broadcastFn) return false;
    agent.resume(this.broadcastFn);
    auditLog(codename, agent.agentId, 'resumed', { reason });
    logger.info({ codename, reason }, 'Agent resumed by runtime directive');
    return true;
  }

  getAgent(codename: string): IAgent | undefined {
    return this.registry.get(codename.toUpperCase());
  }

  getAllAgents(): IAgent[] {
    return [...this.registry.values()];
  }

  getStatus(): Record<string, AgentStatus> {
    const out: Record<string, AgentStatus> = {};
    for (const [name, agent] of this.registry) {
      out[name] = agent.getSnapshot().status;
    }
    return out;
  }

  // ─── Idle watchdog ──────────────────────────────────────────────────────────
  private _startIdleWatchdog(): void {
    this.idleTimer = setInterval(() => this._checkIdle(), IDLE_CHECK_MS);
  }

  private _checkIdle(): void {
    const now = Date.now();
    for (const agent of this.registry.values()) {
      const snap = agent.getSnapshot();
      if (snap.governance.maxIdleMs === 0) continue; // 0 = never auto-suspend
      if (snap.status === 'suspended' || snap.status === 'offline') continue;
      const lastTs = snap.lastActionTs ?? snap.startedAt;
      if (now - lastTs > snap.governance.maxIdleMs) {
        logger.warn({ codename: snap.codename, idleMs: now - lastTs }, 'Agent idle timeout — suspending');
        this.suspend(snap.codename, 'idle timeout');
      }
    }
  }
}

export const agentRuntime = AgentRuntime.getInstance();
