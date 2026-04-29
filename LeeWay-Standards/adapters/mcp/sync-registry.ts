/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.OPS.REGISTRY
TAG: MCP.OPS.REGISTRY.SYNC

COLOR_ONION_HEX:
NEON=#2979FF
FLUO=#448AFF
PASTEL=#BBDEFB

ICON_ASCII:
family=lucide
glyph=refresh-cw

5WH:
WHAT = Registry sync utility — keeps agent-registry.json in sync with live agent directories
WHY = Ensures the agent registry accurately reflects the current operational MCP agent set
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/sync-registry.ts
WHEN = 2026
HOW = File system walker comparing agent-registry.json entries against on-disk agent directories

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const REPORTS_DIR = "c:/MCP agents/aaa-helper-agents/reports";
const REGISTRY_PATH = "c:/MCP agents/agent-registry.json";

async function syncRegistry() {
  console.log("Syncing registry with AAA helper reports...");
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  
  const files = fs.readdirSync(REPORTS_DIR);
  for (const file of files) {
    if (file.endsWith(".report.md")) {
      const agentId = file.replace(".report.md", "");
      const content = fs.readFileSync(path.join(REPORTS_DIR, file), "utf-8");
      
      const statusMatch = content.match(/Status: (PASS|FAIL)/);
      if (statusMatch) {
        const pass = statusMatch[1] === "PASS";
        const agent = registry.agents.find(a => a.id === agentId);
        if (agent) {
          agent.status = pass ? "active" : "failed";
          agent.last_tested_at = new Date().toISOString();
          agent.confidence_score = pass ? 95 : 0;
          console.log(`Updated ${agentId} status to ${agent.status}`);
        }
      }
    }
  }
  
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
  console.log("Registry sync complete.");
}

syncRegistry().catch(console.error);
