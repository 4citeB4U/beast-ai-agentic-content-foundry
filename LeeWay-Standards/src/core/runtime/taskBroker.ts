/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.RUNTIME.TASKBROKER
TAG: AI.ORCHESTRATION.RUNTIME.TASKBROKER.ENGINE

COLOR_ONION_HEX:
NEON=#F97316
FLUO=#FB923C
PASTEL=#FED7AA

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = Task Broker — baton-passing coordinator for the Leeway Runtime agent execution model
WHY = Assigns lead + helper agents to each G1-G8 workflow; manages sequential task handoffs and wake/sleep transitions
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/runtime/taskBroker.ts
WHEN = 2026
HOW = assignBaton() resolves WORLD_REGISTRY, builds an ordered execution chain, and dispatches via EventBus

AGENTS:
ASSESS
AUDIT
BRAIN_SENTINEL

LICENSE:
MIT
*/

import { WORLD_REGISTRY } from '../WorldRegistry';
import { AgentIdentity, WakeState } from '../AgentWorldTypes';

/**
 * Leeway Runtime Universe — Task Broker
 * Responsible for assigning roles and helpers (the Baton System).
 */

export interface TaskAssignment {
  leadId: string;
  helperIds: string[];
  task: any;
}

export const assignTaskToWorld = (task: any): TaskAssignment | null => {
  // Find lead by role or specific family requirement
  const lead = WORLD_REGISTRY.find(a => a.role === task.requestedRole || a.family === task.requestedFamily);
  
  if (!lead) {
    // Default to Lee Prime if no specialist found
    return {
      leadId: "lee-prime",
      helperIds: [],
      task
    };
  }

  // Pick helpers based on relationships or role synergy
  const helpers = WORLD_REGISTRY.filter(a => {
    if (a.id === lead.id) return false;
    // Basic logic: same family agents are natural helpers
    return a.family === lead.family;
  }).slice(0, 2);

  return {
    leadId: lead.id,
    helperIds: helpers.map(h => h.id),
    task
  };
};
