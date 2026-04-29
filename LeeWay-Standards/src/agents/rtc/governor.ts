/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.GOVERNOR
TAG: SFU.NPC.MASTER_GOVERNANCE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=gavel
5WH:
  WHAT = GOVERNOR (AGT-007) — Governance Operations & Verification Engine
  WHY  = Top-level oversight agent; audits all 7 peers, enforces policy,
         issues suspend/resume directives, generates governance reports,
         and is the only agent that cannot be auto-suspended
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/governor.ts
  WHEN = 2026
  HOW  = setInterval 60s → evaluate all agents via governance.ts → if violations
         found issue suspend directive via runtime; publish compliance score to bus
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { agentLogger } from '../logger.js';
import { evaluateAgent, auditLog } from './governance.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

const log = agentLogger('GOVERNOR');

export class GovernorAgent implements IAgent {
  readonly codename     = 'GOVERNOR';
  readonly agentId      = 'AGT-007';

  private status: AgentStatus = 'idle';
  private agentLog: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private violationsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = { complianceScore: 100, auditCycles: 0, violationsTotal: 0 };
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private _getRuntime?: () => import('./runtime.js').AgentRuntime;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this._addLog('info', 'GOVERNOR online — governance enforcement active.');
    log.info('GOVERNOR agent online — all agents are under oversight');
    auditLog(this.codename, this.agentId, 'governance_started', { ts: Date.now() });
    this.timer = setInterval(() => void this.tick(), 60_000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this._addLog('info', 'GOVERNOR offline — governance suspended (manual shutdown only).');
    log.warn('GOVERNOR offline');
  }

  /** GOVERNOR cannot be auto-suspended — no-op with an audit log. */
  suspend(): void {
    log.warn('[GOVERNOR] Suspend attempt rejected — oversight tier agents are immune to suspension.');
    auditLog(this.codename, this.agentId, 'suspend_rejected', { reason: 'oversight tier immunity' });
  }

  /** Resume is a no-op for GOVERNOR since it cannot be suspended. */
  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this._addLog('info', 'GOVERNOR resume called — already active (immune to suspension).');
  }

  setRuntimeGetter(fn: () => import('./runtime.js').AgentRuntime): void {
    this._getRuntime = fn;
  }

  private async tick(): Promise<void> {
    if (!this._getRuntime) return;
    const runtime = this._getRuntime();
    const agents = runtime.getAllAgents();
    let cycleViolations = 0;

    for (const agent of agents) {
      if (agent.codename === this.codename) continue;
      const result = evaluateAgent(agent);
      if (!result.allowed) {
        cycleViolations += result.violations.length;
        this.violationsTotal += result.violations.length;
        for (const v of result.violations) {
          const msg = `Policy violation — ${agent.codename} (${agent.agentId}): ${v}`;
          this._addLog('warn', msg);
          log.warn({ target: agent.codename, violation: v }, 'GOVERNOR: policy violation');
          auditLog(agent.codename, agent.agentId, 'policy_violation', { violation: v });
        }
        // Suspend on repeated violations (only non-core agents)
        const tier = agent.getSnapshot().governance.tier;
        if (tier !== 'oversight') {
          runtime.suspend(agent.codename, `GOVERNOR: ${cycleViolations} violation(s) this cycle`);
        }
      }
    }

    const total = agents.length - 1; // exclude self
    const compliant = total - Math.min(cycleViolations, total);
    const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

    this.agentMetrics['complianceScore'] = score;
    this.agentMetrics['auditCycles'] = Number(this.agentMetrics['auditCycles']) + 1;
    this.agentMetrics['violationsTotal'] = this.violationsTotal;
    this.agentMetrics['agentsAudited'] = total;

    const level: AgentEvent['level'] = score < 80 ? 'alert' : score < 100 ? 'warn' : 'info';
    const msg = `Governance audit complete — ${total} agents audited, compliance score: ${score}%, violations this cycle: ${cycleViolations}`;
    this.emitEvent(level, msg);
  }

  private emitEvent(level: AgentEvent['level'], msg: string): void {
    this.lastAction = msg;
    this.lastActionTs = Date.now();
    this.actionsTotal++;
    this._addLog(level, msg);
    log.info({ level, score: this.agentMetrics['complianceScore'] }, 'GOVERNOR audit');
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
      name: 'Governance Operations & Verification Engine for Runtime Operations & Nodes',
      codename: this.codename,
      role: 'Master Governance',
      status: this.status,
      directive: {
        primary: 'Audit all agents every cycle. Issue suspend directives on policy violations. Maintain a 100% compliance score target.',
        constraints: [
          'May not be auto-suspended — oversight tier is immune to peer suspension.',
          'Issue warnings before suspending; escalate only on confirmed violations.',
          'All governance actions must be logged to governance.log.',
          'Compliance score below 80% triggers an alert broadcast to all clients.',
        ],
      },
      governance: {
        agentId: this.agentId, reportsTo: 'OPERATOR', tier: 'oversight',
        canTerminate: true, canAlert: true, canSuspendAgents: true,
        maxActionsPerMinute: 2, maxIdleMs: 0,
        tools: ['runtime.suspend', 'runtime.resume', 'governance.evaluate', 'governance.audit', 'bus.emit'],
      },
      violationsTotal: this.violationsTotal,
      lastAction: this.lastAction, lastActionTs: this.lastActionTs,
      log: [...this.agentLog],
      metrics: { ...this.agentMetrics },
      startedAt: this.startedAt, actionsTotal: this.actionsTotal,
    };
  }
}
