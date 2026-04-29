/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.PLANNER.TEST
TAG: MCP.AGENT.PLANNER.TEST.HEALTHCHECK

COLOR_ONION_HEX:
NEON=#42A5F5
FLUO=#64B5F6
PASTEL=#BBDEFB

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = Node-based health check script for planner-agent-mcp tools
WHY = Validates planning tool outputs for simple and complex contexts during local QA
WHO = Agent Lee OS — Planner Agent Team
WHERE = MCP agents/planner-agent-mcp/test/health-check.node.js
WHEN = 2026
HOW = Executes makePlan, chooseAgent, and summarizeMission test runs with representative context payloads

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// Node.js-compatible health check for planner-agent-mcp
const { makePlan } = require("../dist/tools/make-plan.js");
const { chooseAgent } = require("../dist/tools/choose-agent.js");
const { summarizeMission } = require("../dist/tools/summarize-mission.js");

const simpleContext = {
  session_id: "test-session-1",
  user_id: "user-1",
  platform: "cerebral",
  intent: "plan_task",
  utterance: "Schedule a meeting",
  plan: [],
  memory_snapshot: null,
  tool_outputs: [],
  policy_flags: [],
  timestamp: new Date().toISOString(),
};

const complicatedContext = {
  session_id: "test-session-2",
  user_id: "user-2",
  platform: "cerebral",
  intent: "orchestrate_agents",
  utterance:
    "Plan a multi-step workflow involving memory recall, code execution, and UI design",
  plan: [],
  memory_snapshot: {
    summary: "User previously scheduled meetings and designed UI",
    key_facts: ["meeting scheduled", "UI designed"],
    episode_ids: ["ep1", "ep2"],
  },
  tool_outputs: [],
  policy_flags: ["complex"],
  timestamp: new Date().toISOString(),
};

async function runHealthChecks() {
  const simplePlan = await makePlan({ context: simpleContext });
  console.log("Simple makePlan result:", simplePlan);

  const complicatedPlan = await makePlan({ context: complicatedContext });
  console.log("Complicated makePlan result:", complicatedPlan);

  const agentResult = await chooseAgent({ intent: "plan_task" });
  console.log("chooseAgent result:", agentResult);

  const missionSummary = await summarizeMission({
    context: complicatedContext,
    tool_outputs: [],
    status: "completed",
    duration_ms: 1234,
  });
  console.log("summarizeMission result:", missionSummary);
}

runHealthChecks().catch(console.error);
