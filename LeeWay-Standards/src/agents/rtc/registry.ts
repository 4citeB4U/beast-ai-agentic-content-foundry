/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.AGENTS.REGISTRY
TAG: SFU.AGENT.REGISTRY
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=list
5WH:
  WHAT = LeeWay Agent Registry — instantiates all 8 agents and wires them to the runtime
  WHY  = Single entry-point for agent fleet; enforces one-instance-per-agent rule via
         AgentRuntime; injects lazy runtime references into REPAIR and GOVERNOR
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/agents/registry.ts
  WHEN = 2026
  HOW  = Creates agents → registers with AgentRuntime → wires circular deps lazily
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import type { IAgent, AgentSnapshot } from './types.js';
import { agentBus } from './bus.js';
import { agentRuntime } from './runtime.js';
import { AriaAgent }     from './aria.js';
import { VectorAgent }   from './vector.js';
import { WardAgent }     from './ward.js';
import { SentinelAgent } from './sentinel.js';
import { NexusAgent }    from './nexus.js';
import { RepairAgent }   from './repair.js';
import { GovernorAgent } from './governor.js';
import { ScalerAgent }   from './scaler.js';
import { ObserverAgent } from './observer.js';
import { logger } from '../logger.js';

// ─── Instantiate the full fleet ───────────────────────────────────────────────
const repair   = new RepairAgent();
const governor = new GovernorAgent();

const FLEET: IAgent[] = [
  new AriaAgent(),     // AGT-001  Health Monitor
  new VectorAgent(),   // AGT-002  Metrics Analyst
  new WardAgent(),     // AGT-003  Room Janitor
  new SentinelAgent(), // AGT-004  Security Guard
  new NexusAgent(),    // AGT-005  Runtime Watchdog
  repair,              // AGT-006  Auto-Repair
  governor,            // AGT-007  Master Governance  (oversight tier — immune to suspension)
  new ScalerAgent(),   // AGT-008  Auto-Scaler
  new ObserverAgent(), // AGT-009  Vision Perception
];

// Register every agent with the shared runtime (throws on duplicate)
for (const agent of FLEET) {
  agentRuntime.register(agent);
}

// Inject lazy runtime getters to break circular imports
repair.setRuntimeGetter(() => agentRuntime);
governor.setRuntimeGetter(() => agentRuntime);

// ─── Legacy-compatible AgentRegistry facade (used by server.ts REST routes) ──
export class AgentRegistry {
  startAll(): void {
    agentRuntime.startAll();
    logger.info({ count: FLEET.length }, 'AgentRegistry.startAll() delegated to AgentRuntime');
  }

  stopAll(): void {
    agentRuntime.stopAll();
  }

  getSnapshot(codename: string): AgentSnapshot | undefined {
    return agentRuntime.getAgent(codename)?.getSnapshot();
  }

  getAllSnapshots(): AgentSnapshot[] {
    return agentRuntime.getAllAgents().map(a => a.getSnapshot());
  }
}

export { agentBus };
export { agentRuntime };
export const agentRegistry = new AgentRegistry();

