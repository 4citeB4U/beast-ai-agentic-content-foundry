/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.PLANNER
TAG: MCP.AGENT.PLANNER.RECOVERY

COLOR_ONION_HEX:
NEON=#FF6D00
FLUO=#FF9100
PASTEL=#FFF3E0

ICON_ASCII:
family=lucide
glyph=refresh-cw

5WH:
WHAT = Planner tool — suggests recovery strategy when a plan step fails
WHY = Enables self-healing plan execution by providing fallback agent routing
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/planner-agent-mcp/tools/suggest-recovery.ts
WHEN = 2026
HOW = Analyzes failed step and error context to produce a recovery suggestion and fallback agent

AGENTS:
ASSESS
ALIGN
AUDIT
ATLAS

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export async function suggestRecovery(
  args: Record<string, unknown>,
): Promise<{ suggestion: string; fallback_agent?: string }> {
  const failedStep = String(args["failed_step"] ?? "");
  const error = String(args["error"] ?? "");

  // Simple rule-based recovery; in production → call glm_flash
  if (error.includes("timeout") || error.includes("ECONNREFUSED")) {
    return {
      suggestion:
        "Service is unreachable. Retry after 5 seconds or switch to fallback agent.",
      fallback_agent: "agent-lee-core",
    };
  }
  if (
    error.includes("auth") ||
    error.includes("401") ||
    error.includes("403")
  ) {
    return {
      suggestion: "Authentication failure. Check API keys in .env.local.",
      fallback_agent: undefined,
    };
  }
  return {
    suggestion: `Failed step "${failedStep}" with: ${error.slice(0, 120)}. Rephrase the task or route to agent-lee-core.`,
    fallback_agent: "agent-lee-core",
  };
}
