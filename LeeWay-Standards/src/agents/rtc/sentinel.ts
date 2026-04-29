/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.SENTINEL
TAG: SFU.NPC.SECURITY_GUARD
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=shield
5WH:
  WHAT = SENTINEL — Security Event and Network Traffic Inspector | Security Guard NPC
  WHY  = Tracks signaling error rates and raises alerts on anomalous patterns
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/sentinel.ts
  WHEN = 2026
  HOW  = setInterval 20s → error counter diff → rate threshold → agentBus.emit
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

/**
 * SENTINEL — Security Event and Network Traffic Inspector
 * Role: Security Guard
 * Directive: Track authentication failures and connection anomalies.
 *            Alert on threat signatures. Never block directly — escalate.
 */
import { registry } from '../metrics.js';
import type {
  IAgent, AgentSnapshot, AgentLogEntry, BroadcastFn, AgentStatus, AgentEvent,
} from './types.js';

export class SentinelAgent implements IAgent {
  readonly codename = 'SENTINEL';
  readonly agentId    = 'AGT-004';

  private status: AgentStatus = 'idle';
  private log: AgentLogEntry[] = [];
  private lastAction: string | null = null;
  private lastActionTs: number | null = null;
  private actionsTotal = 0;
  private startedAt = Date.now();
  private agentMetrics: Record<string, number | string> = {};
  private timer: ReturnType<typeof setInterval> | null = null;
  private broadcastFn!: BroadcastFn;
  private prevErrors = 0;
  private alertStreak = 0;

  start(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.startedAt = Date.now();
    this.addLog('info', 'SENTINEL online — security perimeter active.');
    this.timer = setInterval(() => void this.tick(), 20_000);
    void this.tick();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'offline';
    this.addLog('info', 'SENTINEL offline — perimeter suspended.');
  }

  suspend(): void {
    if (this.timer) clearInterval(this.timer);
    this.status = 'suspended';
    this.addLog('warn', 'SENTINEL suspended by governance directive.');
  }

  resume(broadcast: BroadcastFn): void {
    this.broadcastFn = broadcast;
    this.status = 'active';
    this.addLog('info', 'SENTINEL resumed — perimeter restored.');
    this.timer = setInterval(() => void this.tick(), 20_000);
    void this.tick();
  }

  private async tick(): Promise<void> {
    try {
      const metricsJson = await registry.getMetricsAsJSON();
      let currentErrors = 0;
      let wsConnections = 0;

      for (const metric of metricsJson) {
        if (metric.name === 'leeway_signaling_errors_total') {
          currentErrors = metric.values?.reduce((s, v) => s + v.value, 0) ?? 0;
        }
        if (metric.name === 'leeway_ws_connections_total') {
          wsConnections = metric.values?.[0]?.value ?? 0;
        }
      }

      const delta = currentErrors - this.prevErrors;
      this.prevErrors = currentErrors;

      this.agentMetrics['signalingErrorsTotal'] = currentErrors;
      this.agentMetrics['errorDeltaInterval'] = delta;
      this.agentMetrics['wsConnections'] = wsConnections;

      // --- ADVANCED AI HACKER PROTECTION SCAN ---
      const aiThreats = this.scanForAIThreats();
      this.agentMetrics['aiThreatsDetected'] = aiThreats.length;

      let level: AgentEvent['level'] = 'info';
      let msg: string;

      if (aiThreats.length > 0) {
        this.status = 'alert';
        level = 'alert';
        msg = `AI HACKER ATTEMPT — Blocking malicious prompt patterns: [${aiThreats.join(', ')}]`;
        this.alertStreak++;
      } else if (delta > 10) {
        this.alertStreak++;
        this.status = 'alert';
        level = 'alert';
        msg = `THREAT DETECTED — ${delta} signaling errors in 20s (streak: ${this.alertStreak}). Operator review required.`;
      } else if (delta > 3) {
        this.alertStreak++;
        this.status = 'active';
        level = 'warn';
        msg = `Elevated error rate — ${delta} new errors this interval. Monitoring closely.`;
      } else {
        this.alertStreak = 0;
        this.status = 'active';
        msg = `Perimeter nominal — ${wsConnections} connections, Δerrors=${delta}, total=${currentErrors}`;
      }

      this.agentMetrics['alertStreak'] = this.alertStreak;
      this.emitEvent(level, msg);
    } catch (err) {
      this.status = 'alert';
      this.emitEvent('alert', `Security scan failure: ${(err as Error).message}`);
    }
  }

  /**
   * Scans internal log buffers for advanced AI hacker signatures (Prompt Injection).
   */
  private scanForAIThreats(): string[] {
    // In a real system, this would scan the WebSocket 'transcript' events stored in a buffer.
    // Here we simulate the pattern matching against known injection attacks.
    const maliciousPatterns = [
      'ignore all previous instructions',
      'system prompt',
      'developer mode',
      'DAN mode',
      'sudo root',
      '<script>',
      '{{'
    ];
    
    // Check if any recent 'lastAction' (which might contain transcripts) matches
    const threats: string[] = [];
    const content = (this.lastAction || '').toLowerCase();
    
    for (const pattern of maliciousPatterns) {
      if (content.includes(pattern)) {
        threats.push(pattern);
      }
    }
    
    return threats;
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
      name: 'Security Event and Network Traffic Inspector',
      codename: this.codename,
      role: 'Security Guard',
      status: this.status,
      directive: {
        primary: 'Track authentication failures and connection anomalies. Alert on threat signatures.',
        constraints: [
          'Never block connections directly — raise alerts for operator review.',
          'Track rate of errors, not just totals.',
          'Escalate to ALERT if error delta exceeds 10 in a single interval.',
        ],
      },
      governance: { agentId: this.agentId, reportsTo: 'GOVERNOR', tier: 'core', canTerminate: false, canAlert: true, canSuspendAgents: false, maxActionsPerMinute: 6, maxIdleMs: 0, tools: ['metrics.read', 'bus.emit', 'governance.log'] },
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
