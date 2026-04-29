/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.GOVERNANCE
TAG: SFU.AGENT.POLICY_ENGINE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=scale
5WH:
  WHAT = LeeWay agent governance engine — enforces policy rules across all agents
  WHY  = Keeps every agent within defined action limits, tool permissions, and
         tier constraints; prevents runaway behaviour on edge hardware
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/governance.ts
  WHEN = 2026
  HOW  = Policy registry + rate-limiter + rule checker called by AgentRuntime
         before every agent action; logs violations to combined.log + governance.log
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { createWriteStream } from 'fs';
import { join } from 'path';
import { logger, LOGS_DIR } from '../logger.js';
import type { AgentGovernance, IAgent } from './types.js';

// ─── Governance log (all violations) ──────────────────────────────────────────
const govStream = createWriteStream(join(LOGS_DIR, 'governance.log'), { flags: 'a' });

function govLog(msg: object): void {
  govStream.write(JSON.stringify({ ts: new Date().toISOString(), ...msg }) + '\n');
}

// ─── Action-rate tracker ───────────────────────────────────────────────────────
type RateWindow = { count: number; windowStart: number };
const rateWindows = new Map<string, RateWindow>();

/** Check if the agent is within its maxActionsPerMinute budget. Returns true if OK. */
function checkRate(codename: string, max: number): boolean {
  const now = Date.now();
  const w = rateWindows.get(codename) ?? { count: 0, windowStart: now };
  if (now - w.windowStart > 60_000) {
    rateWindows.set(codename, { count: 1, windowStart: now });
    return true;
  }
  w.count++;
  rateWindows.set(codename, w);
  return w.count <= max;
}

// ─── Governance Rule Set ───────────────────────────────────────────────────────
/**
 * All governance rules enforced on every agent tick.
 * Returns null if OK, or a violation message string.
 */
type RuleCheck = (agent: IAgent, gov: AgentGovernance) => string | null;

const RULES: RuleCheck[] = [
  // Rule 1 — action rate cap
  (agent, gov) => {
    if (!checkRate(agent.codename, gov.maxActionsPerMinute)) {
      return `Rate limit exceeded (max ${gov.maxActionsPerMinute} actions/min)`;
    }
    return null;
  },

  // Rule 2 — offline agents must not be allowed to broadcast
  (agent) => {
    const snap = agent.getSnapshot();
    if (snap.status === 'offline' && snap.lastActionTs !== null &&
        Date.now() - snap.lastActionTs < 5_000) {
      return 'Offline agent attempted to emit an event within 5s of shutdown';
    }
    return null;
  },

  // Rule 3 — governance tier hierarchy (core agents cannot be suspended by peers)
  (_agent, gov) => {
    if (gov.tier === 'oversight' && !gov.canSuspendAgents) {
      return 'Oversight tier agent missing canSuspendAgents permission';
    }
    return null;
  },
];

// ─── Public API ────────────────────────────────────────────────────────────────
export interface GovernanceResult {
  allowed: boolean;
  violations: string[];
}

/**
 * Evaluate all governance rules for an agent before it executes an action.
 * Call this from the runtime before every tick dispatch.
 */
export function evaluateAgent(agent: IAgent): GovernanceResult {
  const snap = agent.getSnapshot();
  const gov  = snap.governance;
  const violations: string[] = [];

  for (const rule of RULES) {
    const v = rule(agent, gov);
    if (v) violations.push(v);
  }

  if (violations.length > 0) {
    const entry = { codename: agent.codename, agentId: agent.agentId, violations };
    govLog(entry);
    logger.warn({ ...entry }, 'Governance violation(s) detected');
  }

  return { allowed: violations.length === 0, violations };
}

/**
 * Log an audit entry (e.g. agent started, stopped, suspended).
 */
export function auditLog(
  codename: string,
  agentId: string,
  event: string,
  detail?: Record<string, unknown>,
): void {
  const entry = { codename, agentId, event, ...detail };
  govLog(entry);
  logger.info({ ...entry }, 'Governance audit');
}

/**
 * Validate that an agent is attempting to use a tool it is authorised for.
 */
export function assertToolPermission(agent: IAgent, tool: string): boolean {
  const gov = agent.getSnapshot().governance;
  if (!gov.tools.includes(tool)) {
    const entry = { codename: agent.codename, agentId: agent.agentId, tool, violation: 'Unauthorized tool use' };
    govLog(entry);
    logger.warn({ ...entry }, 'Tool permission denied');
    return false;
  }
  return true;
}
