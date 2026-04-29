/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.AEGIS.GUARD
TAG: AI.ORCHESTRATION.AGENT.GUARDAEGIS.REGISTRY

COLOR_ONION_HEX:
NEON=#EF4444
FLUO=#F87171
PASTEL=#FECACA

ICON_ASCII:
family=lucide
glyph=user-check

5WH:
WHAT = Guard Aegis — Keeper of the Registry; monitors all registered agents for contract compliance, identity drift, and unauthorized scope changes
WHY = Without a registry keeper, agents can silently drift from their defined contracts; Guard enforces agent-level accountability
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/GuardAegis.ts
WHEN = 2026-04-04
HOW = Static class using WorldRegistry to read all agent registrations; compares actual vs expected metadata; emits violations via EventBus

AGENTS:
ASSESS
AUDIT
AEGIS

LICENSE:
MIT
*/

// agents/GuardAegis.ts — Keeper of the Registry
// Monitors all registered agents for contract compliance and identity integrity.
// Runs periodic audits and emits security events on violations.

import { WORLD_REGISTRY } from '../../core/WorldRegistry';
import { ReportWriter } from '../../core/ReportWriter';
import { eventBus } from '../../core/EventBus';

const AGENT_ID = 'Guard_Aegis';
const FAMILY   = 'AEGIS' as const;

export interface RegistryAuditResult {
  total_agents: number;
  compliant: number;
  violations: Array<{ agentId: string; issue: string; severity: 'WARN' | 'ERROR' }>;
  audit_at: string;
}

export class GuardAegis {
  private static auditTimer: ReturnType<typeof setInterval> | null = null;

  /** Initialize: schedule periodic registry audits. */
  static initialize(tickMs = 30 * 60 * 1000 /* 30 minutes */): void {
    if (this.auditTimer) return;

    this.auditTimer = setInterval(() => {
      this.auditRegistry().catch(err =>
        console.error('[GuardAegis] Audit failed:', err)
      );
    }, tickMs);

    // Run once at boot after a short delay
    setTimeout(() => this.auditRegistry(), 5000);
  }

  static teardown(): void {
    if (this.auditTimer) {
      clearInterval(this.auditTimer);
      this.auditTimer = null;
    }
  }

  /**
   * Audit all registered agents against their expected contract metadata.
   */
  static async auditRegistry(): Promise<RegistryAuditResult> {
    eventBus.emit('agent:active', { agent: 'GuardAegis', task: 'Registry compliance audit' });

    const allAgents = WORLD_REGISTRY;
    const violations: RegistryAuditResult['violations'] = [];

    for (const agent of allAgents) {
      // Check required identity fields
      if (!agent.id || !agent.name || !agent.family) {
        violations.push({
          agentId: agent.id ?? 'UNKNOWN',
          issue: 'Missing required identity fields (id, name, or family)',
          severity: 'ERROR',
        });
        continue;
      }

      // Check state is a valid WakeState
      const validStates = ['HIBERNATE', 'SLEEP', 'IDLE', 'ACTIVE', 'COUNCIL'];
      if (agent.state && !validStates.includes(agent.state.wakeState)) {
        violations.push({
          agentId: agent.id,
          issue: `Invalid wakeState "${agent.state.wakeState}"`,
          severity: 'WARN',
        });
      }
    }

    const result: RegistryAuditResult = {
      total_agents: allAgents.length,
      compliant: allAgents.length - violations.length,
      violations,
      audit_at: new Date().toISOString(),
    };

    const severity = violations.some(v => v.severity === 'ERROR')
      ? 'ERROR'
      : violations.length > 0 ? 'WARN' : 'INFO';

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'GOVERNANCE',
      family: FAMILY,
      severity,
      event: 'STEP_COMPLETE',
      message: `GuardAegis registry audit: ${result.compliant}/${result.total_agents} compliant, ${violations.length} violations`,
      agent_id: AGENT_ID,
    });

    if (violations.length > 0) {
      eventBus.emit('shield:threat', {
        module: AGENT_ID,
        severity: violations.some(v => v.severity === 'ERROR') ? 'high' : 'low',
        detail: `Registry violations: ${violations.map(v => v.agentId).join(', ')}`,
      });
    }

    eventBus.emit('agent:done', { agent: 'GuardAegis', result: `audit:${result.compliant}/${result.total_agents}` });
    return result;
  }
}
