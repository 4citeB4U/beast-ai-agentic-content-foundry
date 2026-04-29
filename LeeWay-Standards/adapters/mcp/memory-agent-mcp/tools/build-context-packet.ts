/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.CONTEXT

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=package

5WH:
WHAT = Memory tool — builds a typed ContextPacket from raw agent request parameters
WHY = Produces the standard context envelope used across all MCP agent interactions
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/tools/build-context-packet.ts
WHEN = 2026
HOW = Assembles ContextPacket from session_id, user_id, platform, intent, memory, and policy data

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import type {
    ContextPacket,
    IntentClass,
    Platform,
} from "../../contracts/agent-contracts";
import { recallContext } from "./recall-context.js";

export async function buildContextPacket(
  args: Record<string, unknown>,
): Promise<ContextPacket> {
  const session_id = String(args["session_id"] ?? "unknown");
  const user_id = String(args["user_id"] ?? "user");
  const intent = String(args["intent"] ?? "converse") as IntentClass;
  const utterance = String(args["utterance"] ?? "");
  const platform = String(args["platform"] ?? "cloudflare") as Platform;

  const memory_snapshot = await recallContext({
    session_id,
    utterance,
    intent,
  });

  return {
    session_id,
    user_id,
    platform,
    intent,
    utterance,
    plan: [],
    memory_snapshot: memory_snapshot.summary ? memory_snapshot : null,
    tool_outputs: [],
    policy_flags: [],
    timestamp: new Date().toISOString(),
    model_lane_override: null,
  };
}
