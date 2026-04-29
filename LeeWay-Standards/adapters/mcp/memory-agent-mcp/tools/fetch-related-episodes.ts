/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.EPISODES

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=history

5WH:
WHAT = Memory tool — fetches related mission episodes from the InsForge canonical memory store
WHY = Provides episodic memory recall to inform Agent Lee's current context with past missions
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/tools/fetch-related-episodes.ts
WHEN = 2026
HOW = Queries InsForge REST API with a similarity key and returns top matching MissionSummaries

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import type { MissionSummary } from "../../contracts/agent-contracts";
import { env } from "../../shared/env.js";

export async function fetchRelatedEpisodes(
  args: Record<string, unknown>,
): Promise<MissionSummary[]> {
  const utterance = String(args["utterance"] ?? "");
  const topK = Number(args["top_k"] ?? 3);
  const baseUrl = env("CANONICAL_MEMORY_BASE_URL", "");
  const apiKey = env("CANONICAL_MEMORY_API_KEY", "");

  if (!baseUrl || !apiKey) return [];

  try {
    const url = new URL(`${baseUrl}/api/missions/search`);
    url.searchParams.set("q", utterance);
    url.searchParams.set("limit", String(topK));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as MissionSummary[];
  } catch {
    return [];
  }
}
