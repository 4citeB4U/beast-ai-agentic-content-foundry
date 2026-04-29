/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.SHARED.UTILS
TAG: MCP.SHARED.ENV.ACCESSOR

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=sliders

5WH:
WHAT = Shared env accessor — safe environment variable reader with logging for all MCP agents
WHY = Prevents runtime crashes from missing env vars and provides unified agent event logging
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/shared/env.ts
WHEN = 2026
HOW = Wraps process.env with typed accessors (env, envRequired) and appends events to per-agent log files

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import "dotenv/config";
import { appendFileSync } from "fs";
import { join } from "path";
import { buildAgentLeeCorePrompt } from "../contracts/agent-lee-behavior-policies";

export { buildAgentLeeCorePrompt };

export function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

// Remove envRequired dependency for MCP_TOOLKIT_PATH
// All agents should be self-contained and not require external toolkit paths
export function envRequired(key: string): string {
  const val = process.env[key];
  if (!val)
    throw new Error(`[AgentLeeOS] Required env var "${key}" is not set.`);
  return val;
}

// Standardized handshake for all MCP agents
export async function performHandshake(agentId: string) {
  const registryPath = join(__dirname, "..", "agent-registry.json");
  const registry = JSON.parse(require("fs").readFileSync(registryPath, "utf-8"));
  const entry = registry.agents.find((a: any) => a.id === agentId);

  if (!entry) {
    throw new Error(`[AgentLeeOS] Handshake failed: Agent "${agentId}" not in registry.`);
  }

  return {
    id: entry.id,
    version: "1.0.0", // To be dynamically pulled from package.json if needed
    capabilities: entry.capabilities,
    workflow_roles: entry.workflow_roles,
    ops: entry.ops,
    status: entry.status,
    timestamp: new Date().toISOString()
  };
}

// Centralized logging utility for MCP agents
export function logAgentEvent(
  agentId: string,
  event: string,
  details?: object,
) {
  // Use __dirname to reliably point to the shared workspace root
  const logDir = join(__dirname, "..", "aaa-helper-agents", "log");
  if (!require("fs").existsSync(logDir)) require("fs").mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `${agentId}.log`);
  const timestamp = new Date().toISOString();
  const entry = [
    `[${timestamp}] [${agentId}] ${event}`,
    details ? JSON.stringify(details, null, 2) : "",
  ]
    .filter(Boolean)
    .join("\n");
  appendFileSync(logFile, entry + "\n\n");
}
