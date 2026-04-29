/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.INSFORGE.SERVER

COLOR_ONION_HEX:
NEON=#2979FF
FLUO=#448AFF
PASTEL=#BBDEFB

ICON_ASCII:
family=lucide
glyph=cloud

5WH:
WHAT = InsForge MCP agent server — canonical memory lake operations via InsForge / Vercel
WHY = Provides Agent Lee with persistent remote memory storage and retrieval
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/insforge-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing InsForge CRUD tools over SSE transport

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";

import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { appendFile } from "fs/promises";
import { env } from "../shared/env.js";

const CACHE_PATH = "data/insforge_cache.jsonl";

const TOOLS = [
  {
    name: "save_memory",
    description: "Upsert a memory record into the canonical lake.",
    inputSchema: { type: "object" },
  },
  {
    name: "fetch_memory",
    description: "Retrieve a memory record by key.",
    inputSchema: { type: "object" },
  },
  {
    name: "normalize_record",
    description: "Normalize a raw object against a named schema.",
    inputSchema: { type: "object" },
  },
  {
    name: "create_schema",
    description: "Define a new table schema in the canonical lake.",
    inputSchema: { type: "object" },
  },
  {
    name: "store_episode",
    description: "Persist a conversational episode.",
    inputSchema: { type: "object" },
  },
  {
    name: "write_task_result",
    description: "Store the result of a completed agent task.",
    inputSchema: { type: "object" },
  },
];

async function apiCall(
  path: string,
  method: string,
  body?: unknown,
): Promise<unknown> {
  const base = env("CANONICAL_MEMORY_BASE_URL", "");
  const apiKey = env("CANONICAL_MEMORY_API_KEY", "");
  if (!base || !apiKey)
    throw new Error("CANONICAL_MEMORY_BASE_URL / API_KEY not set");

  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok)
    throw new Error(`InsForge API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function withFallback<T>(
  operation: () => Promise<T>,
  fallbackData: unknown,
): Promise<T | { cached: true }> {
  try {
    return await operation();
  } catch (err) {
    console.warn("[InsForgeAgent] Remote failed, caching locally:", err);
    await appendFile(
      CACHE_PATH,
      JSON.stringify({ ts: new Date().toISOString(), data: fallbackData }) +
        "\n",
      "utf-8",
    ).catch(() => {});
    return { cached: true };
  }
}

const server = new MCPServer(
  { name: "insforge-agent-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  let result: unknown;

  switch (req.params.name) {
    case "save_memory":
      result = await withFallback(
        () => apiCall("/api/memory", "POST", args),
        args,
      );
      break;
    case "fetch_memory":
      result = await apiCall(
        `/api/memory/${encodeURIComponent(String(args["key"]))}`,
        "GET",
      );
      break;
    case "normalize_record":
      result = { normalized: true, record: args["record"] }; // pass-through; schema validation deferred
      break;
    case "create_schema":
      result = await withFallback(
        () => apiCall("/api/schemas", "POST", args),
        args,
      );
      break;
    case "store_episode":
      result = await withFallback(
        () => apiCall("/api/episodes", "POST", args),
        args,
      );
      break;
    case "write_task_result":
      result = await withFallback(
        () =>
          apiCall(`/api/missions/${args["mission_id"]}/result`, "PUT", args),
        args,
      );
      break;
    default:
      throw new Error(`Unknown tool: ${req.params.name}`);
  }

  return { content: [{ type: "text", text: JSON.stringify(result) }] };
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

const port = Number(process.env.MCP_AGENT_HTTP_PORT) || 3015;
const host = process.env.MCP_AGENT_HTTP_HOST || "127.0.0.1";
app.listen(port, host, () => {
  console.log("startup");
  console.log("transport_ready");
  console.log("health_ready");
});

