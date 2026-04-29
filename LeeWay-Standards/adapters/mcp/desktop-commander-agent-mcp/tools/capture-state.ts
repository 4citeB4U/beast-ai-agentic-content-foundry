/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.CAPTURE

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=camera

5WH:
WHAT = Desktop Commander tool — captures the current system state (processes, memory, network)
WHY = Gives Agent Lee situational awareness of what is running on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/capture-state.ts
WHEN = 2026
HOW = Executes system info commands and aggregates results into a structured state snapshot

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
import { promisify } from "util";

const execAsync = promisify(exec);

export async function captureState(args: Record<string, unknown>): Promise<{
  processes: string;
  memory: string;
  disk: string;
  timestamp: string;
}> {
  const [procs, mem, disk] = await Promise.allSettled([
    execAsync("tasklist /fo csv /nh").then((r) =>
      r.stdout.trim().split("\n").slice(0, 20).join("\n"),
    ),
    execAsync(
      "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /value",
    ).then((r) => r.stdout.trim()),
    execAsync("wmic logicaldisk get Caption,FreeSpace,Size /value").then((r) =>
      r.stdout.trim(),
    ),
  ]);

  return {
    processes: procs.status === "fulfilled" ? procs.value : "unavailable",
    memory: mem.status === "fulfilled" ? mem.value : "unavailable",
    disk: disk.status === "fulfilled" ? disk.value : "unavailable",
    timestamp: new Date().toISOString(),
  };
}
