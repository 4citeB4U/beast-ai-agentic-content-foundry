#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.STANDARDS_AGENT_STATUS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = standards-agent-status — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/standards-agent-status.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");
const statusPath = path.join(standardsRoot, "receipts", "standards-agent-status.json");

const exists = await fs
  .stat(statusPath)
  .then(() => true)
  .catch(() => false);

if (!exists) {
  console.log(JSON.stringify({
    status: "missing",
    message: "No standards agent status file exists yet. Run any SSA mode first.",
    expectedPath: statusPath,
  }, null, 2));
  process.exit(0);
}

const payload = JSON.parse(await fs.readFile(statusPath, "utf8"));
const statuses = Array.isArray(payload.statuses) ? payload.statuses : [];

const response = {
  generatedAt: payload.generatedAt,
  mode: payload.mode,
  scope: payload.scope,
  doctrine: payload.doctrine,
  leeWayOperationalState: payload.leeWayOperationalState,
  phase: payload.phase,
  summary: payload.summary || {
    totalAgents: statuses.length,
    blockedAgents: statuses.filter((s) => s.status === "blocked").length,
    errorAgents: statuses.filter((s) => s.status === "error").length,
  },
  agents: statuses.map((s) => ({
    agentId: s.agentId,
    title: s.title,
    status: s.status,
    lastRunAt: s.lastRunAt,
    receiptCount: s.receiptCount,
    blockingCount: s.blockingCount,
    reposWatched: s.reposWatched,
    currentMission: s.currentMission,
    leeWayPhase: s.leeWayPhase,
  })),
};

console.log(JSON.stringify(response, null, 2));
