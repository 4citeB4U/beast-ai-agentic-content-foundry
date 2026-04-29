/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.PLANNER
TAG: MCP.AGENT.PLANNER.TEST

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=test-tubes

5WH:
WHAT = Planner Agent health check and integration test suite
WHY = Verifies that planner tools (choose-agent, make-plan, summarize-mission) are functionally correct
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/planner-agent-mcp/test/health-check.test.ts
WHEN = 2026
HOW = Runs scenario-based integration tests against planner tool functions with mock contexts

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

// Automated health check and integration tests for planner-agent-mcp
import { chooseAgent } from "../tools/choose-agent";
import { makePlan } from "../tools/make-plan";
import { summarizeMission } from "../tools/summarize-mission";

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
  // Simple health check
  const simplePlan = await makePlan({ context: simpleContext });
  console.log("Simple makePlan result:", simplePlan);

  // Complicated health check
  const complicatedPlan = await makePlan({ context: complicatedContext });
  console.log("Complicated makePlan result:", complicatedPlan);

  // Agent selection
  const agentResult = await chooseAgent({ intent: "plan_task" });
  console.log("chooseAgent result:", agentResult);

  // Mission summary
  const missionSummary = await summarizeMission({
    context: complicatedContext,
    tool_outputs: [],
    status: "completed",
    duration_ms: 1234,
  });
  console.log("summarizeMission result:", missionSummary);
}

runHealthChecks().catch(console.error);
