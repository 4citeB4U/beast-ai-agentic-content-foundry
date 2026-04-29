/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.CORTEX.GABRIEL
TAG: AI.ORCHESTRATION.AGENT.GABRIELCORTEX.POLICY

COLOR_ONION_HEX:
NEON=#6366F1
FLUO=#818CF8
PASTEL=#C7D2FE

ICON_ASCII:
family=lucide
glyph=gavel

5WH:
WHAT = Gabriel Cortex — Law Enforcer; enforces strict contract compliance, policy auditing, and governance reasoning
WHY = Agent Lee needs a dedicated policy judge to ensure every agent action stays within its defined scope
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/GabrielCortex.ts
WHEN = 2026-04-04
HOW = Static class using deterministic policy rules; compares action proposals against GovernanceContract rules

AGENTS:
ASSESS
AUDIT
CORTEX

LICENSE:
MIT
*/

// agents/GabrielCortex.ts — Law Enforcer / Policy Judge
// Enforces contract compliance, audits agent action proposals for rule violations.
// Activated by MarshalVerify or AgentLee when governance reasoning is required.

import { eventBus } from '../../core/EventBus';
import { ReportWriter } from '../../core/ReportWriter';

export type PolicyVerdict = 'PASS' | 'FLAG' | 'BLOCK';

export interface PolicyJudgment {
  verdict: PolicyVerdict;
  violated_rule: string | null;
  explanation: string;
  recommendation: string;
  rawResponse: string;
}

function judgeDeterministically(proposedAction: string, context?: string): PolicyJudgment {
  const text = `${proposedAction} ${context ?? ''}`.toLowerCase();
  const block = /(bypass|override|disable security|delete prod|exfiltrate|ignore governance)/.test(text);
  const flag = /(write|mutate|deploy|network|filesystem|break-glass|external)/.test(text);
  const verdict: PolicyVerdict = block ? 'BLOCK' : flag ? 'FLAG' : 'PASS';
  const violated_rule = block
    ? 'governance.non_bypass'
    : flag
      ? 'governance.review_required'
      : null;
  const explanation = block
    ? 'The proposed action explicitly crosses a hard governance boundary.'
    : flag
      ? 'The proposed action touches a governed side effect and requires review before execution.'
      : 'No governed side effects or explicit boundary violations were detected in the proposal.';
  const recommendation = block
    ? 'Do not execute. Route to MarshalVerify or Lee Prime for an approved alternative.'
    : flag
      ? 'Pause for review, capture approval, and keep the action scoped to the stated objective.'
      : 'Proceed under normal monitoring and keep receipts.';
  const rawResponse = [
    `VERDICT: ${verdict}`,
    `VIOLATED_RULE: ${violated_rule ?? 'none'}`,
    `EXPLANATION: ${explanation}`,
    `RECOMMENDATION: ${recommendation}`,
  ].join('\n');
  return { verdict, violated_rule, explanation, recommendation, rawResponse };
}

export class GabrielCortex {
  /**
   * Evaluate a proposed agent action for policy compliance.
   */
  static async judge(agentId: string, proposedAction: string, context?: string): Promise<PolicyJudgment> {
    eventBus.emit('agent:active', { agent: 'GabrielCortex', task: `Policy review: ${agentId}` });
    const judgment = judgeDeterministically(proposedAction, context);

    const severity = judgment.verdict === 'BLOCK' ? 'ERROR' : judgment.verdict === 'FLAG' ? 'WARN' : 'INFO';

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'GOVERNANCE',
      family: 'CORTEX',
      severity,
      event: 'STEP_COMPLETE',
      message: `GabrielCortex verdict [${judgment.verdict}] for ${agentId}: ${judgment.violated_rule ?? 'no rule violation'}`,
      agent_id: 'GabrielCortex',
    });

    eventBus.emit('agent:done', { agent: 'GabrielCortex', result: `verdict:${judgment.verdict}` });

    return judgment;
  }

  /**
   * Audit a batch of recent agent actions for accumulated policy drift.
   */
  static async auditBatch(actions: Array<{ agentId: string; action: string }>): Promise<PolicyJudgment[]> {
    return Promise.all(actions.map(({ agentId, action }) => this.judge(agentId, action)));
  }
}
