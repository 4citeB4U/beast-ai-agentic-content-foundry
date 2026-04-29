/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.PLANNER
TAG: MCP.AGENT.PLANNER.SERVER

COLOR_ONION_HEX:
NEON=#FF6D00
FLUO=#FF9100
PASTEL=#FFF3E0

ICON_ASCII:
family=lucide
glyph=map

5WH:
WHAT = Planner MCP agent server — decomposes intents into ordered agent-assigned task plans
WHY = Provides Agent Lee with structured mission planning and step decomposition capabilities
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/planner-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing planner tools over SSE transport with session context management

AGENTS:
ASSESS
ALIGN
AUDIT
ATLAS

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import express from "express";
// mcps/agents/planner-agent-mcp/index.ts
// Decompose intents into ordered agent-assigned task plans
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { env } from "../shared/env";
import type { AgentRegistration } from "./contracts/agent-contracts.js";
import { breakIntoSteps } from "./tools/break-into-steps.js";
import { chooseAgent } from "./tools/choose-agent.js";
import { makePlan } from "./tools/make-plan.js";
import { suggestRecovery } from "./tools/suggest-recovery.js";
import { summarizeMission } from "./tools/summarize-mission.js";

export const REGISTRATION: AgentRegistration = {
  id: "planner-agent-mcp",
  name: "PlannerAgent",
  mission: "Decompose intents into ordered plans and assign steps to agents.",
  layer: "backbone",
  model_lane: "glm_flash",
  fallback_model_lane: "qwen_local",
  authority_boundaries: "Plan and delegate only. No execution, no file I/O.",
  deployment_location: "cerebral",
  fallback_behavior: "Fall back to qwen_local if glm_flash unavailable.",
  health_check: "make_plan",
  memory_scope: "mission",
  tools: [
    {
      name: "make_plan",
      description: "Make an ordered agent-assigned plan from a ContextPacket.",
      input_schema: { type: "object" },
    },
    {
      name: "break_into_steps",
      description: "Break a goal string into granular sub-tasks.",
      input_schema: { type: "object" },
    },
    {
      name: "choose_agent",
      description: "Return best primary agent ID for an intent class.",
      input_schema: { type: "object" },
    },
    {
      name: "suggest_recovery",
      description: "Propose corrective action after a failed step.",
      input_schema: { type: "object" },
    },
    {
      name: "summarize_mission",
      description: "Produce a MissionSummary for the completed turn.",
      input_schema: { type: "object" },
    },
  ],
};

const server = new MCPServer(
  { name: REGISTRATION.id, version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: REGISTRATION.tools.map(
    (t: { name: string; description: string; input_schema: object }) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.input_schema,
    }),
  ),
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  switch (req.params.name) {
    case "make_plan":
      return {
        content: [{ type: "text", text: JSON.stringify(await makePlan(args)) }],
      };
    case "break_into_steps":
      return {
        content: [
          { type: "text", text: JSON.stringify(await breakIntoSteps(args)) },
        ],
      };
    case "choose_agent":
      return {
        content: [
          { type: "text", text: JSON.stringify(await chooseAgent(args)) },
        ],
      };
    case "suggest_recovery":
      return {
        content: [
          { type: "text", text: JSON.stringify(await suggestRecovery(args)) },
        ],
      };
    case "summarize_mission":
      return {
        content: [
          { type: "text", text: JSON.stringify(await summarizeMission(args)) },
        ],
      };
    default:
      throw new Error(`Unknown tool: ${req.params.name}`);
  }
});

const PORT = env("PLANNER_AGENT_PORT", "4106");
const HOST = env("PLANNER_AGENT_HOST", "0.0.0.0");
const HTTPS_PORT = env("PLANNER_AGENT_HTTPS_PORT", "41016");
const HTTPS_CERT = env("PLANNER_AGENT_HTTPS_CERT", "");
const HTTPS_KEY = env("PLANNER_AGENT_HTTPS_KEY", "");

const app = express();
app.get("/", (req, res) => res.json({status: "healthy"}));

let sseTransport: SSEServerTransport;
app.get("/sse", async (req, res) => {
  sseTransport = new SSEServerTransport("/message", res);
  await server.connect(sseTransport);
});
app.post("/message", async (req, res) => {
  if (sseTransport) await sseTransport.handlePostMessage(req, res);
});

const expressPort = Number(process.env.MCP_AGENT_HTTP_PORT) || 3004;
app.listen(expressPort, "127.0.0.1", () => {
  console.log("startup\\ntransport_ready\\nhealth_ready");
});

