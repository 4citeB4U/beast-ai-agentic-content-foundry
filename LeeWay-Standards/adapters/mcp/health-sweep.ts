/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.OPS.HEALTH
TAG: MCP.OPS.HEALTH.SWEEP

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=activity

5WH:
WHAT = Health sweep runner — validates all MCP agent servers are responsive
WHY = Ensures system-wide MCP agent health before operations are dispatched
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/health-sweep.ts
WHEN = 2026
HOW = Executes health check commands sequentially via child_process for each registered agent

AGENTS:
ASSESS
ALIGN
AUDIT
HEALTH

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { exec } from "child_process";
import { promisify } from "util";
import "dotenv/config";

const execAsync = promisify(exec);

async function runSweep() {
  console.log("Starting health sweep...");
  // We can't easily import the class because it's in a different project with its own node_modules
  // But we can trigger it via the tool if we start it as a child process.
  
  // Actually, since it's already running on port 4001, let's try a simple HTTP POST if possible,
  // or just run a new instance to get the result.
  
  const { stdout } = await execAsync("npx tsx -e \"import { sweepAllServices } from './index.ts'; sweepAllServices().then(r => console.log(JSON.stringify(r, null, 2)))\"", {
    cwd: "c:/MCP agents/health-agent-mcp",
    env: {
      ...process.env,
      ZAI_API_KEY: "f32e2885f85948fb9eb3f87b14b6bc4b.lPh2F2zFyN0mjBAX",
      INSFORGE_BASE_URL: "https://3c4cp27v.us-west.insforge.app"
    }
  });
  
  console.log(stdout);
}

runSweep().catch(console.error);
