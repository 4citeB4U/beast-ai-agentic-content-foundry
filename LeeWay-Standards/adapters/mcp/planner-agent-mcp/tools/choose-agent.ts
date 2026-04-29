/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.PLANNER
TAG: MCP.AGENT.PLANNER.CHOOSE

COLOR_ONION_HEX:
NEON=#FF6D00
FLUO=#FF9100
PASTEL=#FFF3E0

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = Planner tool — selects the best agent and model lane for a given intent class
WHY = Provides dynamic agent routing based on the canonical intent-router dispatch map
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/planner-agent-mcp/tools/choose-agent.ts
WHEN = 2026
HOW = Looks up the IntentClass in INTENT_ROUTER_MAP and returns agent, lane, and fallbacks

AGENTS:
ASSESS
ALIGN
AUDIT
ATLAS

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import type { IntentClass } from "../contracts/agent-contracts.js";
import { INTENT_ROUTER_MAP } from "../contracts/intent-router-map.js";

export async function chooseAgent(
  args: Record<string, unknown>,
): Promise<{ agent: string; model_lane: string; fallbacks: string[] }> {
  const intent = String(args["intent"] ?? "") as IntentClass;
  const route = INTENT_ROUTER_MAP[intent];
  if (!route) {
    return { agent: "agent-lee-core", model_lane: "leeway", fallbacks: [] };
  }
  return {
    agent: route.primary_agent,
    model_lane: route.model_lane,
    fallbacks: route.fallback_agents ?? [],
  };
}

