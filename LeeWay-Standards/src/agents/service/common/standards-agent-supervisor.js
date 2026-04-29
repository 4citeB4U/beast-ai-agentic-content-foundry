/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.STANDARDS_AGENT_SUPERVISOR.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = standards-agent-supervisor — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/common/standards-agent-supervisor.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { STANDARDS_SERVICE_AGENTS, assertStandardsAgentsHaveVmIdentity } from "./standards-service-agents.js";
import { LEEWAY_DOCTRINE, deriveLeeWayPhase } from "./leeway-doctrine.js";

const VALID_STATES = {
  IDLE: "idle",
  RUNNING: "running",
  ERROR: "error",
  BLOCKED: "blocked",
};

function isActiveInMode(agent, mode) {
  if (!agent || !Array.isArray(agent.mode)) return false;
  return agent.mode.includes(mode);
}

function deriveMission(agent, mode, active) {
  const governedPath = LEEWAY_DOCTRINE.governedPath.join(" -> ");

  if (!active) {
    return `${agent.title} standby in ${mode} mode under governed path ${governedPath}`;
  }

  switch (mode) {
    case "scan":
      return `${agent.title} scanning layered governance for policy drift`;
    case "purge-plan":
      return `${agent.title} generating workflow evidence for controlled execution`;
    case "enforce":
      return `${agent.title} enforcing architecture law across ${governedPath}`;
    case "quarantine":
      return `${agent.title} executing approved isolation within defined limits`;
    case "move-simulate":
      return `${agent.title} simulating structural rehome impact before mutation`;
    case "move-analyze":
      return `${agent.title} analyzing import and dependency impact before rehome approval`;
    case "move-apply":
      return `${agent.title} executing approved structural rehome with rewrite enforcement`;
    case "move-group-analyze":
      return `${agent.title} building dependency-aware move groups — Phase 4 coordinated recomposition`;
    case "move-group-apply":
      return `${agent.title} executing coordinated group move with full import alignment`;
    case "move-resolve-blockers":
      return `${agent.title} coordinating blocker resolution per dependency group before any group move`;
    default:
      return `${agent.title} running ${mode} mission`;
  }
}

function statusPath(receiptsDir) {
  return path.join(receiptsDir, "standards-agent-status.json");
}

async function writeStatus(receiptsDir, payload) {
  await fs.mkdir(receiptsDir, { recursive: true });
  await fs.writeFile(statusPath(receiptsDir), JSON.stringify(payload, null, 2), "utf8");
}

export async function initializeStandardsAgentStatus({ receiptsDir, mode, scope }) {
  const now = Date.now();
  const leeWayPhase = deriveLeeWayPhase(mode);
  const agents = assertStandardsAgentsHaveVmIdentity(STANDARDS_SERVICE_AGENTS);
  const statuses = agents.map((agent) => {
    const active = isActiveInMode(agent, mode);
    return {
      agentId: agent.agentId,
      title: agent.title,
      status: active ? VALID_STATES.RUNNING : VALID_STATES.IDLE,
      lastRunAt: now,
      receiptCount: 0,
      blockingCount: 0,
      reposWatched: [scope],
      currentMission: deriveMission(agent, mode, active),
      authority: agent.authority,
      watchScope: agent.watchScope,
      packagePath: agent.packagePath,
      entrypoint: agent.entrypoint,
      receiptAgent: agent.receiptAgent,
      leeWayPhase,
      identitySurface: agent.identitySurface,
      vmSurfaceId: agent.vmSurface.surfaceId,
      vmSurfaceRoute: agent.vmSurface.route,
      vmRequired: agent.vmSurface.required,
      fullIdentitySurface: agent.vmSurface.fullIdentitySurface,
      standardsMonitored: agent.vmSurface.standardsMonitored,
      vmMounted: true,
    };
  });

  const payload = {
    generatedAt: new Date(now).toISOString(),
    mode,
    scope,
    doctrine: LEEWAY_DOCTRINE,
    leeWayOperationalState: leeWayPhase,
    phase: "running",
    statuses,
  };

  await writeStatus(receiptsDir, payload);
  return { startedAt: now, statusFile: statusPath(receiptsDir) };
}

export async function finalizeStandardsAgentStatus({ receiptsDir, mode, scope, startedAt, receipts }) {
  const now = Date.now();
  const leeWayPhase = deriveLeeWayPhase(mode);
  const agents = assertStandardsAgentsHaveVmIdentity(STANDARDS_SERVICE_AGENTS);
  const statuses = agents.map((agent) => {
    const mine = receipts.filter((r) => r.agent === agent.receiptAgent);
    const blockingCount = mine.filter((r) => r.severity === "blocking").length;
    const errorCount = mine.filter((r) => r.severity === "error").length;

    let status = VALID_STATES.IDLE;
    if (blockingCount > 0) {
      status = VALID_STATES.BLOCKED;
    } else if (errorCount > 0) {
      status = VALID_STATES.ERROR;
    } else if (mine.length > 0) {
      status = VALID_STATES.IDLE;
    }

    return {
      agentId: agent.agentId,
      title: agent.title,
      status,
      lastRunAt: now,
      receiptCount: mine.length,
      blockingCount,
      reposWatched: [scope],
      currentMission: deriveMission(agent, mode, isActiveInMode(agent, mode)),
      authority: agent.authority,
      watchScope: agent.watchScope,
      packagePath: agent.packagePath,
      entrypoint: agent.entrypoint,
      receiptAgent: agent.receiptAgent,
      leeWayPhase,
      identitySurface: agent.identitySurface,
      vmSurfaceId: agent.vmSurface.surfaceId,
      vmSurfaceRoute: agent.vmSurface.route,
      vmRequired: agent.vmSurface.required,
      fullIdentitySurface: agent.vmSurface.fullIdentitySurface,
      standardsMonitored: agent.vmSurface.standardsMonitored,
      vmMounted: true,
    };
  });

  const payload = {
    generatedAt: new Date(now).toISOString(),
    mode,
    scope,
    doctrine: LEEWAY_DOCTRINE,
    leeWayOperationalState: leeWayPhase,
    phase: "completed",
    runDurationMs: Math.max(0, now - startedAt),
    statuses,
    summary: {
      totalAgents: statuses.length,
      activeAgents: statuses.filter((s) => isActiveInMode(agents.find((a) => a.agentId === s.agentId), mode)).length,
      blockedAgents: statuses.filter((s) => s.status === VALID_STATES.BLOCKED).length,
      errorAgents: statuses.filter((s) => s.status === VALID_STATES.ERROR).length,
      totalReceipts: receipts.length,
      totalBlockingReceipts: receipts.filter((r) => r.severity === "blocking").length,
    },
  };

  await writeStatus(receiptsDir, payload);
  return {
    statusFile: statusPath(receiptsDir),
    summary: payload.summary,
  };
}
