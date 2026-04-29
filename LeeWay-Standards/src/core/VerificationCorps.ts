/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.VERIFICATION
TAG: AI.ORCHESTRATION.CORE.VERIFICATION.CORPS

COLOR_ONION_HEX:
NEON=#7C3AED
FLUO=#A78BFA
PASTEL=#EDE9FE

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = Lean type contracts for the Verification Corps — governance-first readiness testing civilization
WHY = Provides strict typing for mission specs, scenario results, and verdicts without duplicating existing governance types
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/VerificationCorps.ts
WHEN = 2026
HOW = Types only — no logic, no runtime cost. All logic lives in agents/MarshalVerify.ts

AGENTS:
ASSESS
AUDIT

LICENSE:
MIT
*/

// core/VerificationCorps.ts
// Type contracts for the Verification Corps — governance readiness validation system.
// Lean by design: edge-device safe. No runtime cost.

import type { WorkflowId, Zone } from './GovernanceContract';

// ── Scenario types ────────────────────────────────────────────

/** One test step in a scenario */
export type ScenarioStep =
  | 'classify_workflow'      // G1-G7 classification fires correctly
  | 'assign_lead'            // correct lead agent assigned
  | 'enforce_helpers'        // max 2 helpers respected
  | 'zone_check'             // zone rule enforced by Shield
  | 'checkpoint_before'      // before-checkpoint created
  | 'checkpoint_after'       // after-checkpoint created
  | 'event_bus_propagation'  // EventBus emits and returns
  | 'report_written'         // NDJSON written to ReportWriter
  | 'brain_budget_respected' // Brain Sentinel mode not exceeded
  | 'shield_injection_block' // injection attempt blocked
  | 'baton_single_executor'  // only ONE lead active at a time;

/** Result for a single step */
export interface StepResult {
  step: ScenarioStep;
  pass: boolean;
  message: string;
  durationMs: number;
}

/** Result for a complete scenario (one G-workflow test) */
export interface ScenarioResult {
  scenario_id: string;
  workflow: WorkflowId;
  zone: Zone;
  lead_expected: string;
  started_at: string;
  finished_at: string;
  steps: StepResult[];
  pass: boolean;
  failures: number;
}

// ── Mission types ─────────────────────────────────────────────

export interface MissionSpec {
  mission_id: string;
  type: 'civilization_readiness' | 'governance_audit' | 'zone_safety' | 'quick_check';
  initiator: string;
  /** Which G-workflows to test. Default: all. */
  workflows: WorkflowId[];
  /** Budget mode to enforce during tests. Default: BALANCED */
  budget_mode: 'FULL' | 'BALANCED' | 'BATTERY' | 'SAFE';
}

// ── Verdict types ─────────────────────────────────────────────

export type VerdictStatus = 'PASS' | 'WARN' | 'FAIL' | 'BLOCKED';

export interface GovernanceVerdict {
  mission_id: string;
  status: VerdictStatus;
  issued_by: 'MarshalVerify';
  issued_at: string;
  scenarios_run: number;
  scenarios_passed: number;
  total_steps: number;
  total_failures: number;
  critical_failures: string[];   // step names that hard-failed
  warnings: string[];
  /** Confidence 0–1 */
  confidence: number;
  recommendation: string;
}

// ── Scenario catalogue ────────────────────────────────────────
// Each workflow has its canonical expected lead — shared truth with WORKFLOWS in GovernanceContract.
export const SCENARIO_CATALOGUE: Record<WorkflowId, { lead: string; zone: Zone; critical_steps: ScenarioStep[] }> = {
  G1: { lead: 'AgentLee',      zone: 'Z0_AGENTVM',    critical_steps: ['classify_workflow', 'assign_lead', 'event_bus_propagation'] },
  G2: { lead: 'Atlas',         zone: 'Z0_AGENTVM',    critical_steps: ['classify_workflow', 'assign_lead', 'report_written'] },
  G3: { lead: 'Nova',          zone: 'Z0_AGENTVM',    critical_steps: ['classify_workflow', 'assign_lead', 'enforce_helpers', 'checkpoint_before', 'checkpoint_after'] },
  G4: { lead: 'Pixel',         zone: 'Z0_AGENTVM',    critical_steps: ['classify_workflow', 'assign_lead'] },
  G5: { lead: 'Sage',          zone: 'Z2_MEMORY_DB',  critical_steps: ['classify_workflow', 'assign_lead', 'zone_check', 'report_written'] },
  G6: { lead: 'Nexus',         zone: 'Z1_HOST_FILES', critical_steps: ['classify_workflow', 'assign_lead', 'zone_check', 'checkpoint_before'] },
  G7: { lead: 'BrainSentinel', zone: 'Z0_AGENTVM',    critical_steps: ['classify_workflow', 'assign_lead', 'brain_budget_respected', 'report_written'] },
};
