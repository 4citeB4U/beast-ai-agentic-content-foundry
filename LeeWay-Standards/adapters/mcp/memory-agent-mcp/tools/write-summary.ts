/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.WRITE

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=save

5WH:
WHAT = Memory tool — writes a mission summary to InsForge remote or local JSONL fallback
WHY = Persists completed mission summaries to the agent’s long-term memory store
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/tools/write-summary.ts
WHEN = 2026
HOW = POSTs to InsForge REST API with JSON body, falls back to appendFile local JSONL on failure

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { appendFile } from "fs/promises";
import type { MissionSummary } from "../../contracts/agent-contracts";
import { env } from "../../shared/env.js";

const CACHE_PATH = "data/memory_cache.jsonl";

export async function writeSummary(
  args: Record<string, unknown>,
): Promise<{ stored: boolean; location: string }> {
  const summary = args["summary"] as MissionSummary;
  const baseUrl = env("CANONICAL_MEMORY_BASE_URL", "");
  const apiKey = env("CANONICAL_MEMORY_API_KEY", "");

  if (baseUrl && apiKey) {
    try {
      const res = await fetch(`${baseUrl}/api/missions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(summary),
      });
      if (res.ok) return { stored: true, location: "vercel" };
      console.warn(`[MemoryAgent] Vercel write failed: ${res.status}`);
    } catch (err) {
      console.error("[MemoryAgent] writeSummary remote error:", err);
    }
  }

  // Local fallback
  await appendFile(CACHE_PATH, JSON.stringify(summary) + "\n", "utf-8");
  return { stored: true, location: "local_cache" };
}
