/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.WRITEFILE

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=file-edit

5WH:
WHAT = Desktop Commander tool — writes or appends content to an allowlisted host file
WHY = Provides Agent Lee with controlled file write access on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/write-file.ts
WHEN = 2026
HOW = Path-guarded writeFile / appendFile with auto-mkdir and allowlist enforcement

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { appendFile, mkdir, writeFile } from "fs/promises";
import { dirname } from "path";
import { assertAllowedPath } from "../lib/path-guard.js";

const AUDIT_LOG = "backend/logs/desktop-commander-audit.jsonl";

export async function writeHostFile(
  args: Record<string, unknown>,
): Promise<{ written: boolean; path: string }> {
  const safePath = assertAllowedPath(String(args["path"] ?? ""));
  const content = String(args["content"] ?? "");
  const doAppend = Boolean(args["append"] ?? false);

  await mkdir(dirname(safePath), { recursive: true });
  if (doAppend) {
    await appendFile(safePath, content, "utf-8");
  } else {
    await writeFile(safePath, content, "utf-8");
  }

  const logEntry = {
    ts: new Date().toISOString(),
    tool: "write_file",
    path: safePath,
    bytes: content.length,
    append: doAppend,
  };
  await appendFile(AUDIT_LOG, JSON.stringify(logEntry) + "\n", "utf-8").catch(
    () => {},
  );

  return { written: true, path: safePath };
}
