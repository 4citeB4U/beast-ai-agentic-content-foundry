/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.OPENAPP

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=external-link

5WH:
WHAT = Desktop Commander tool — launches an application by name or path on the host
WHY = Provides Agent Lee with the ability to open applications on Cerebral PC
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/tools/open-app.ts
WHEN = 2026
HOW = Uses child_process spawn to launch the target app in a detached process

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { spawn } from "child_process";

export async function openApp(
  args: Record<string, unknown>,
): Promise<{ launched: boolean; app: string }> {
  const app = String(args["app"] ?? "");
  const appArgs = (args["args"] as string[]) ?? [];
  if (!app) throw new Error("app is required");

  const child = spawn(app, appArgs, {
    detached: true,
    stdio: "ignore",
    shell: true,
  });
  child.unref();
  return { launched: true, app };
}
