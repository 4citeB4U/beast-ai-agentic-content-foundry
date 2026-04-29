/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.TERMINAL

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=terminal

5WH:
WHAT = Desktop Commander tool — runs a shell command in an allowlisted working directory
WHY = Provides Agent Lee with controlled terminal access on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/run-terminal.ts
WHEN = 2026
HOW = Path-guarded exec with output capture, logging, and allowlisted cwd enforcement

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
import { assertAllowedPath } from "../lib/path-guard.js";

const execAsync = promisify(exec);
const AUDIT_LOG = "backend/logs/desktop-commander-audit.jsonl";
const DEFAULT_CWD = "C:\\Tools\\Portable-VSCode-MCP-Kit";

export async function runTerminal(args: Record<string, unknown>): Promise<{
  stdout: string;
  stderr: string;
  exit_code: number;
}> {
  const command = String(args["command"] ?? "").trim();
  const rawCwd = String(args["cwd"] ?? DEFAULT_CWD);
  const timeout = Number(args["timeout_ms"] ?? 30_000);

  if (!command) throw new Error("command is required");

  const cwd = assertAllowedPath(rawCwd);

  const logEntry = {
    ts: new Date().toISOString(),
    tool: "run_terminal",
    command,
    cwd,
  };
  await appendFile(AUDIT_LOG, JSON.stringify(logEntry) + "\n", "utf-8").catch(
    () => {},
  );

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 4,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), exit_code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: (e.stdout ?? "").trim(),
      stderr: (e.stderr ?? String(err)).trim(),
      exit_code: e.code ?? 1,
    };
  }
}
