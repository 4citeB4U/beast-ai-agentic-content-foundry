"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = env;
exports.envRequired = envRequired;
exports.logAgentEvent = logAgentEvent;
/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.SHARED.ENV
TAG: MCP.SHARED.ENV.UTILS

COLOR_ONION_HEX:
NEON=#26A69A
FLUO=#4DB6AC
PASTEL=#B2DFDB

ICON_ASCII:
family=lucide
glyph=key-round

5WH:
WHAT = Shared environment utilities for MCP agents, including env access and agent log helpers
WHY = Standardizes safe env reads and centralized logging behavior across MCP agent services
WHO = Agent Lee OS — MCP Shared Layer
WHERE = MCP agents/shared/env.js
WHEN = 2026
HOW = Exposes fallback/required env accessors and file-based logging helper for agent lifecycle events

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

require("dotenv/config");
const fs_1 = require("fs");
const path_1 = require("path");
function env(key, fallback = "") {
    return process.env[key] ?? fallback;
}
// Remove envRequired dependency for MCP_TOOLKIT_PATH
// All agents should be self-contained and not require external toolkit paths
function envRequired(key) {
    const val = process.env[key];
    if (!val)
        throw new Error(`[AgentLeeOS] Required env var "${key}" is not set.`);
    return val;
}
// Centralized logging utility for MCP agents
function logAgentEvent(agentId, event, details) {
    // Use __dirname to reliably point to the shared workspace root
    const logDir = (0, path_1.join)(__dirname, "..", "aaa-helper-agents", "log");
    if (!require("fs").existsSync(logDir))
        require("fs").mkdirSync(logDir, { recursive: true });
    const logFile = (0, path_1.join)(logDir, `${agentId}.log`);
    const timestamp = new Date().toISOString();
    const entry = [
        `[${timestamp}] [${agentId}] ${event}`,
        details ? JSON.stringify(details, null, 2) : "",
    ]
        .filter(Boolean)
        .join("\n");
    (0, fs_1.appendFileSync)(logFile, entry + "\n\n");
}
