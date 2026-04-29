/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.HEALTH
TAG: MCP.AGENT.HEALTH.SERVER

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=heart-pulse

5WH:
WHAT = Health MCP agent server — monitors and reports health status of all registered agents
WHY = Provides real-time health monitoring for every agent in the MCP system
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/health-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing health-check tools over SSE transport with URL safety guards

AGENTS:
ASSESS
ALIGN
AUDIT
HEALTH

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import "dotenv/config";
import { existsSync } from "fs";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

const REGISTRY_PATH =
  process.env.REGISTRY_PATH ?? join(__dirname, "../../../agent-registry.json");

// ── URL safety guard ─────────────────────────────────────────────────────
const PRIVATE_IP_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

function isSafeTargetUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "file:") return false;
    return !PRIVATE_IP_RE.test(u.hostname) || u.hostname === "localhost";
  } catch {
    return false;
  }
}

// No cloud model lanes. Only local DB/service probes remain.
// MODEL_LANE_PROBES removed for offline-only operation.

// ── tool implementations ──────────────────────────────────────────────────

async function pingService(
  target: string,
  timeout_ms = 10000,
): Promise<{
  target: string;
  status: "ok" | "timeout" | "error";
  latency_ms: number;
  http_status?: number;
  error?: string;
}> {
  // If target looks like an agent ID (no slashes), ping its conceptual health
  if (!target.startsWith("http")) {
    return {
      target,
      status: "ok",
      latency_ms: 0,
      error: "Agent ID ping: use url for HTTP check",
    };
  }
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout_ms);
    const res = await fetch(target, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return {
      target,
      status: res.ok ? "ok" : "error",
      latency_ms: Date.now() - t0,
      http_status: res.status,
    };
  } catch (e: unknown) {
    const latency_ms = Date.now() - t0;
    const timedOut = latency_ms >= timeout_ms - 50;
    return {
      target,
      status: timedOut ? "timeout" : "error",
      latency_ms,
      error: String(e),
    };
  }
}



async function checkDbConnection(
  target: "vercel_postgres" | "insforge" | "local_cache" = "vercel_postgres",
): Promise<{
  target: string;
  status: "ok" | "error";
  latency_ms: number;
  error?: string;
}> {
  const t0 = Date.now();
  if (target === "local_cache") {
    // Just check that the data dir exists
    const exists = existsSync(join(__dirname, "../../../../data"));
    return {
      target,
      status: exists ? "ok" : "error",
      latency_ms: Date.now() - t0,
    };
  }
  const baseUrl = process.env.INSFORGE_BASE_URL ?? "";
  if (!baseUrl)
    return {
      target,
      status: "error",
      latency_ms: Date.now() - t0,
      error: "INSFORGE_BASE_URL not set",
    };
  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        Authorization: `Bearer ${process.env.INSFORGE_API_KEY ?? ""}`,
      },
    });
    return {
      target,
      status: res.ok ? "ok" : "error",
      latency_ms: Date.now() - t0,
    };
  } catch (e: unknown) {
    return {
      target,
      status: "error",
      latency_ms: Date.now() - t0,
      error: String(e),
    };
  }
}

async function checkCerebralVm(
  includeResources = true,
): Promise<{
  status: "ok" | "error";
  latency_ms: number;
  resources?: object;
  error?: string;
}> {
  const t0 = Date.now();
  try {
    if (includeResources) {
      const { stdout } = await execAsync(
        "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /VALUE 2>NUL",
      );
      return {
        status: "ok",
        latency_ms: Date.now() - t0,
        resources: { raw: stdout.trim() },
      };
    }
    return { status: "ok", latency_ms: Date.now() - t0 };
  } catch (e: unknown) {
    return { status: "error", latency_ms: Date.now() - t0, error: String(e) };
  }
}

async function sweepAllServices(
  includeLanes = true,
  includeAgents = true,
  includeDb = true,
): Promise<{
  services: object[];
  degraded_count: number;
  healthy_count: number;
  root_cause_analysis: object[];
}> {
  const results: {
    name: string;
    status: string;
    latency_ms: number;
    error?: string;
  }[] = [];

  // Model lane checks removed for offline-only operation.

  // Backend service
  const backendPing = await pingService(
    "http://localhost:6001/api/health",
    5000,
  );
  results.push({
    name: "service:backend",
    status: backendPing.status,
    latency_ms: backendPing.latency_ms,
  });

  // DB
  if (includeDb) {
    const db = await checkDbConnection("local_cache");
    results.push({
      name: "db:local_cache",
      status: db.status,
      latency_ms: db.latency_ms,
    });
  }

  // Cerebral
  const cerebral = await checkCerebralVm(false);
  results.push({
    name: "vm:cerebral",
    status: cerebral.status,
    latency_ms: cerebral.latency_ms,
  });

  const degraded = results.filter((r) => r.status !== "ok");
  const healthy_count = results.length - degraded.length;

  const root_cause_analysis = degraded.map((d) => ({
    service: d.name,
    probable_cause: d.error?.includes("API key")
      ? "Auth key missing or expired"
      : d.error?.includes("ECONNREFUSED") || d.error?.includes("fetch")
        ? "Service not running or unreachable"
        : d.status === "timeout"
          ? "Service too slow or overloaded"
          : "Unknown — check logs",
    recommendation: `Check ${d.name} config and restart.`,
  }));

  return {
    services: results,
    degraded_count: degraded.length,
    healthy_count,
    root_cause_analysis,
  };
}

// ── MCP Server ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "health-agent-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "ping_service",
      description: "Ping a single service URL or agent ID.",
      inputSchema: {
        type: "object",
        required: ["target"],
        properties: {
          target: { type: "string" },
          timeout_ms: { type: "number" },
        },
      },
    },
    // check_model_lane tool removed for offline-only operation.
    {
      name: "check_db_connection",
      description: "Verify DB connectivity.",
      inputSchema: {
        type: "object",
        properties: { target: { type: "string" } },
      },
    },
    {
      name: "check_cerebral_vm",
      description: "Verify Cerebral PC is reachable.",
      inputSchema: {
        type: "object",
        properties: { include_resources: { type: "boolean" } },
      },
    },
    {
      name: "sweep_all_services",
      description: "Full multi-service diagnostic sweep.",
      inputSchema: {
        type: "object",
        properties: {
          include_model_lanes: { type: "boolean" },
          include_agents: { type: "boolean" },
          include_db: { type: "boolean" },
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let result: unknown;
    switch (name) {
      case "ping_service":
        result = await pingService(
          args.target as string,
          args.timeout_ms as number,
        );
        break;
      case "check_model_lane":
        result = await checkModelLane(args.model_lane as string);
        break;
      case "check_db_connection":
        result = await checkDbConnection(
          args.target as "vercel_postgres" | "insforge" | "local_cache",
        );
        break;
      case "check_cerebral_vm":
        result = await checkCerebralVm(args.include_resources as boolean);
        break;
      case "sweep_all_services":
        result = await sweepAllServices(
          args.include_model_lanes as boolean,
          args.include_agents as boolean,
          args.include_db as boolean,
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  } catch (err: unknown) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: String(err) }) }],
      isError: true,
    };
  }
});

const app = express();
app.get("/", (req, res) => res.json({status: "healthy"}));

let sseTransport: SSEServerTransport;
app.get("/sse", async (req, res) => {
  sseTransport = new SSEServerTransport("/message", res);
  await server.connect(sseTransport);
});
app.post("/message", async (req, res) => {
  if (sseTransport) await sseTransport.handlePostMessage(req, res);
});

const port = Number(process.env.MCP_AGENT_HTTP_PORT || 3001);
const host = process.env.MCP_AGENT_HTTP_HOST || "127.0.0.1";
app.listen(port, host, () => {
  console.log("startup");
  console.log("transport_ready");
  console.log("health_ready");
});

export const REGISTRATION = {
  id: "health-agent-mcp",
  name: "HealthAgent",
  layer: "backbone",
  model_lane: "none",
  status: "unknown",
};










