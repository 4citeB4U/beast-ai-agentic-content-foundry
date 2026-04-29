/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.READFILE

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=file-text

5WH:
WHAT = Desktop Commander tool — reads the content of an allowlisted host file
WHY = Provides Agent Lee with controlled file read access on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/read-file.ts
WHEN = 2026
HOW = Path-guarded readFile with allowlist enforcement before any file access

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { readFile } from "fs/promises";
import { assertAllowedPath } from "../lib/path-guard.js";

export async function readHostFile(
  args: Record<string, unknown>,
): Promise<{ content: string; path: string }> {
  const safePath = assertAllowedPath(String(args["path"] ?? ""));
  const content = await readFile(safePath, "utf-8");
  return { content, path: safePath };
}
