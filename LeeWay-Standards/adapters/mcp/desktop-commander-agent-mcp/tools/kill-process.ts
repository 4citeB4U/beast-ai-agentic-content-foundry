/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.KILLPROCESS

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=x-circle

5WH:
WHAT = Desktop Commander tool — terminates a running process by name or PID
WHY = Provides Agent Lee with process management control on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/kill-process.ts
WHEN = 2026
HOW = Uses taskkill (Windows) or kill (POSIX) via exec to terminate the target process

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { exec } from "child_process";
import { appendFile } from "fs/promises";
import { promisify } from "util";

const execAsync = promisify(exec);
const AUDIT_LOG = "backend/logs/desktop-commander-audit.jsonl";

export async function killProcess(
  args: Record<string, unknown>,
): Promise<{ killed: boolean; target: string }> {
  const target = String(args["target"] ?? "").trim();
  const force = Boolean(args["force"] ?? false);
  if (!target) throw new Error("target is required");

  const isNumeric = /^\d+$/.test(target);
  let cmd: string;
  if (isNumeric) {
    cmd = force ? `taskkill /PID ${target} /F` : `taskkill /PID ${target}`;
  } else {
    cmd = force ? `taskkill /IM "${target}" /F` : `taskkill /IM "${target}"`;
  }

  const logEntry = {
    ts: new Date().toISOString(),
    tool: "kill_process",
    target,
    force,
  };
  await appendFile(AUDIT_LOG, JSON.stringify(logEntry) + "\n", "utf-8").catch(
    () => {},
  );

  try {
    await execAsync(cmd);
    return { killed: true, target };
  } catch (err) {
    return { killed: false, target };
  }
}
