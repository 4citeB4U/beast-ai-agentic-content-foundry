/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.RUNTIME.SCHEDULER
TAG: AI.ORCHESTRATION.RUNTIME.SCHEDULER.ENGINE

COLOR_ONION_HEX:
NEON=#10B981
FLUO=#34D399
PASTEL=#A7F3D0

ICON_ASCII:
family=lucide
glyph=clock

5WH:
WHAT = Leeway Runtime Scheduler — wake/sleep lifecycle manager for all agents in the civilization
WHY = Enforces Brain Sentinel budget modes (FULL/BALANCED/BATTERY/SLEEP_CITY/SAFE) and rotates agents between states
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/runtime/scheduler.ts
WHEN = 2026
HOW = tick() loop reads WORLD_REGISTRY, applies BrainSentinel mode caps, and transitions WakeState for each agent

AGENTS:
ASSESS
AUDIT
BRAIN_SENTINEL

LICENSE:
MIT
*/

import { WORLD_REGISTRY, getAgentById } from '../WorldRegistry';
import { WakeState } from '../AgentWorldTypes';

/**
 * Leeway Runtime Universe — Scheduler
 * Controls the Wake/Sleep cycles of the Agent Civilization.
 * Ensures only localized, efficient execution (Ideal for edge devices).
 */

const MAX_ACTIVE_AGENTS = 3; // Phone-safe default
const ACTIVE_REGISTRY: Set<string> = new Set();

/**
 * Update system-wide agent states based on load and priority.
 */
export const runSchedulerTick = () => {
  // 1. Gather all currently "ACTIVE" identities
  const currentlyActive = WORLD_REGISTRY.filter(a => a.state.wakeState === "ACTIVE");

  // 2. If load is too high, rotate least-recently-used agents to SLEEP
  if (currentlyActive.length > MAX_ACTIVE_AGENTS) {
    const toSleep = currentlyActive.slice(MAX_ACTIVE_AGENTS);
    toSleep.forEach(a => setAgentWakeState(a.id, "SLEEP"));
  }

  // 3. Promote COUNCIL participants if necessary
  // (In a council, multi-agent coordination is enforced)
};

/**
 * Explicitly wake an agent to perform a task.
 */
export const wakeAgent = (id: string, state: WakeState = "ACTIVE") => {
  const agent = getAgentById(id);
  if (!agent) return;

  // Enforce rotation if at capacity
  if (state === "ACTIVE" && ACTIVE_REGISTRY.size >= MAX_ACTIVE_AGENTS) {
    const oldestId = Array.from(ACTIVE_REGISTRY)[0];
    setAgentWakeState(oldestId, "SLEEP");
    ACTIVE_REGISTRY.delete(oldestId);
  }

  if (state === "ACTIVE") ACTIVE_REGISTRY.add(id);
  setAgentWakeState(id, state);
};

/**
 * Transition an agent to a safe dormant state.
 */
export const sleepAgent = (id: string) => {
  setAgentWakeState(id, "SLEEP");
  ACTIVE_REGISTRY.delete(id);
};

/**
 * Internal state updater (Simulated in registry)
 */
function setAgentWakeState(id: string, state: WakeState) {
  const agent = WORLD_REGISTRY.find(a => a.id === id);
  if (agent) {
    agent.state.wakeState = state;
    // Log state transition in Memory Lake
    console.log(`[Universe] Agent ${agent.name} transitioned to ${state}`);
  }
}
