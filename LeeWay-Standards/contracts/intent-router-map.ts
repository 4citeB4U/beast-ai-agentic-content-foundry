/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.CONTRACTS.ROUTING
TAG: MCP.CONTRACTS.INTENT.ROUTER

COLOR_ONION_HEX:
NEON=#FF6D00
FLUO=#FF9100
PASTEL=#FFF3E0

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = Intent Router Map — canonical dispatch table mapping intent classes to agents and model lanes
WHY = Provides a single authoritative routing configuration for all agent dispatch decisions
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/contracts/intent-router-map.ts
WHEN = 2026
HOW = Typed constant object implementing IntentRouterMap contract for runtime routing lookups

AGENTS:
ASSESS
ALIGN
AUDIT
ATLAS

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import type { IntentRouterMap } from "./agent-contracts";

export const INTENT_ROUTER_MAP: IntentRouterMap = {
  converse: {
    primary_agent: "agent-lee-core",
    model_lane: "leeway",
    fallback_agents: ["memory-agent-mcp"],
  },
  plan_task: {
    primary_agent: "planner-agent-mcp",
    model_lane: "glm_flash",
    fallback_agents: ["agent-lee-core"],
  },
  recall_memory: {
    primary_agent: "memory-agent-mcp",
    model_lane: "notebooklm",
    fallback_agents: ["agent-lee-core"],
  },
  write_memory: {
    primary_agent: "memory-agent-mcp",
    model_lane: "notebooklm",
    fallback_agents: ["insforge-agent-mcp"],
  },
  execute_code: {
    primary_agent: "desktop-commander-agent-mcp",
    model_lane: "qwen_local",
    fallback_agents: ["agent-lee-core"],
  },
  execute_terminal: {
    primary_agent: "desktop-commander-agent-mcp",
    model_lane: "qwen_local",
    fallback_agents: [],
  },
  automate_browser: {
    primary_agent: "playwright-agent-mcp",
    model_lane: "qwen_local",
    fallback_agents: ["desktop-commander-agent-mcp"],
  },
  analyze_visual: {
    primary_agent: "vision-agent-mcp",
    model_lane: "glm_vision",
    fallback_agents: ["agent-lee-core"],
  },
  generate_3d: {
    primary_agent: "spline-agent-mcp",
    model_lane: "qwen_3d",
    fallback_agents: [],
  },
  translate_language: {
    primary_agent: "agent-lee-core",
    model_lane: "leeway",
    fallback_agents: [],
  },
  test_system: {
    primary_agent: "testsprite-agent-mcp",
    model_lane: "qwen_local",
    fallback_agents: ["playwright-agent-mcp"],
  },
  design_ui: {
    primary_agent: "stitch-agent-mcp",
    model_lane: "leeway",
    fallback_agents: ["agent-lee-core"],
  },
  speak_voice: {
    primary_agent: "voice-agent-mcp",
    model_lane: "leeway",
    fallback_agents: ["agent-lee-core"],
  },
  orchestrate_agents: {
    primary_agent: "planner-agent-mcp",
    model_lane: "glm_flash",
    fallback_agents: ["agent-lee-core"],
  },
};

