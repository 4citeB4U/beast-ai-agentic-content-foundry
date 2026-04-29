/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.REGISTRY
TAG: MCP.AGENT.REGISTRY.SERVER

COLOR_ONION_HEX:
NEON=#2979FF
FLUO=#448AFF
PASTEL=#BBDEFB

ICON_ASCII:
family=lucide
glyph=list

5WH:
WHAT = Agent Registry MCP server — exposes agent-registry.json as a live read/write MCP service
WHY = Provides a single source of truth for all agent registrations, accessible to the MCP network
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/agent-registry-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server with SSE transport, serving registry CRUD tools over HTTP + HTTPS

AGENTS:
ASSESS
ALIGN
AUDIT
REGISTRY

LICENSE:
PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import express from "express";
// agent-registry-mcp/index.ts
// Exposes the agent-registry.json as a live MCP service for read/write operations.

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import "dotenv/config";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { env } from "../shared/env.js";

const REGISTRY_PATH = env(
  "REGISTRY_PATH",
  join(__dirname, "../../../agent-registry.json"),
);

const PORT = env("AGENT_REGISTRY_PORT", "4100");
const HOST = env("AGENT_REGISTRY_HOST", "0.0.0.0");
const HTTPS_PORT = env("AGENT_REGISTRY_HTTPS_PORT", "4103");
const HTTPS_CERT = env("AGENT_REGISTRY_HTTPS_CERT", "");
const HTTPS_KEY = env("AGENT_REGISTRY_HTTPS_KEY", "");

// ── registry helpers ──────────────────────────────────────────────────────

interface AgentEntry {
  id: string;
  name: string;
  layer: string;
  unique_tag?: string;
  tags?: string[];
  model_lane: string;
  status: "unknown" | "online" | "degraded" | "failed" | "quarantined";
  basic_task_status?: "unknown" | "passed" | "failed";
  complex_task_status?: "unknown" | "passed" | "failed";
  last_tested_at?: string | null;
  confidence_score?: number;
  intents?: string[];
  fallback?: string;
  transport?: string;
  deployment?: string;
  [key: string]: unknown;
}

interface AgentRegistry {
  version: string;
  agents: AgentEntry[];
  [key: string]: unknown;
}

function buildUniqueTag(agent: AgentEntry): string {
  const cleanLayer = (agent.layer || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const cleanId = (agent.id || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `mcp:${cleanLayer}:${cleanId}`;
}

function ensureRegistryContract(registry: AgentRegistry): {
  registry: AgentRegistry;
  changed: boolean;
} {
  let changed = false;
  const usedTags = new Set<string>();

  const normalizedAgents = (registry.agents ?? []).map((agent) => {
    const next = { ...agent };
    const baseTag = buildUniqueTag(next);
    let uniqueTag = next.unique_tag && next.unique_tag.trim() ? next.unique_tag.trim() : baseTag;
    let suffix = 1;
    while (usedTags.has(uniqueTag)) {
      uniqueTag = `${baseTag}-${suffix}`;
      suffix += 1;
    }
    usedTags.add(uniqueTag);

    if (next.unique_tag !== uniqueTag) {
      next.unique_tag = uniqueTag;
      changed = true;
    }

    const existingTags = Array.isArray(next.tags) ? next.tags : [];
    const requiredTags = [
      'leeway:managed',
      'contract:strict',
      `layer:${next.layer || 'unknown'}`,
      `agent:${next.id || 'unknown'}`
    ];
    const mergedTags = Array.from(new Set([...existingTags, ...requiredTags]));
    if (mergedTags.length !== existingTags.length) {
      next.tags = mergedTags;
      changed = true;
    }

    return next;
  });

  return {
    registry: { ...registry, agents: normalizedAgents },
    changed
  };
}

function loadRegistry(): AgentRegistry {
  if (!existsSync(REGISTRY_PATH)) {
    return { version: "1.0.0", agents: [] };
  }
  try {
    const parsed: AgentRegistry = JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
    const normalized = ensureRegistryContract(parsed);
    if (normalized.changed) {
      saveRegistry(normalized.registry);
    }
    return normalized.registry;
  } catch {
    return { version: "1.0.0", agents: [] };
  }
}

function saveRegistry(registry: AgentRegistry): void {
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf-8");
}

// ── tool implementations ──────────────────────────────────────────────────

function listAgents(
  filter_status?: string,
  filter_layer?: string,
): { agents: AgentEntry[]; total: number; filtered: number } {
  const reg = loadRegistry();
  let agents = reg.agents ?? [];
  const total = agents.length;
  if (filter_status) agents = agents.filter((a) => a.status === filter_status);
  if (filter_layer) agents = agents.filter((a) => a.layer === filter_layer);
  return { agents, total, filtered: agents.length };
}

function getAgentCapabilities(
  agent_id: string,
): AgentEntry | { error: string } {
  const reg = loadRegistry();
  const agent = (reg.agents ?? []).find((a) => a.id === agent_id);
  if (!agent) return { error: `Agent not found: ${agent_id}` };
  return agent;
}

function updateAgentStatus(
  agent_id: string,
  status: AgentEntry["status"],
  extra?: Partial<AgentEntry>,
): { updated: boolean; agent_id: string; new_status: string } {
  // Validate status to prevent injection of arbitrary fields
  const VALID_STATUSES = new Set([
    "unknown",
    "online",
    "degraded",
    "failed",
    "quarantined",
  ]);
  if (!VALID_STATUSES.has(status)) {
    throw new Error(`Invalid status value: ${status}`);
  }

  const reg = loadRegistry();
  const idx = (reg.agents ?? []).findIndex((a) => a.id === agent_id);
  if (idx === -1) return { updated: false, agent_id, new_status: status };

  reg.agents[idx] = { ...reg.agents[idx], status, ...extra };
  saveRegistry(reg);
  return { updated: true, agent_id, new_status: status };
}

function getFallbackChain(agent_id: string): {
  chain: string[];
  agent_id: string;
} {
  const reg = loadRegistry();
  const agents = reg.agents ?? [];
  const chain: string[] = [];
  let current = agents.find((a) => a.id === agent_id);
  const visited = new Set<string>();

  while (current && current.fallback && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current.fallback);
    current = agents.find((a) => a.id === current!.fallback);
  }

  return { chain, agent_id };
}

function checkAuthority(
  agent_id: string,
  required_layer: string,
): {
  authorized: boolean;
  agent_id: string;
  agent_layer: string;
  required_layer: string;
} {
  const reg = loadRegistry();
  const agent = (reg.agents ?? []).find((a) => a.id === agent_id);
  if (!agent)
    return { authorized: false, agent_id, agent_layer: "none", required_layer };
  // Layer hierarchy: backbone > interaction > peripheral
  const hierarchy = ["peripheral", "interaction", "backbone"];
  const agentRank = hierarchy.indexOf(agent.layer ?? "peripheral");
  const requiredRank = hierarchy.indexOf(required_layer);
  return {
    authorized: agentRank >= requiredRank,
    agent_id,
    agent_layer: agent.layer,
    required_layer,
  };
}

function getSystemReadiness(): {
  total: number;
  active: number;
  degraded: number;
  failed: number;
  quarantined: number;
  unknown: number;
  readiness_pct: number;
  intent_coverage: Record<string, string[]>;
} {
  const reg = loadRegistry();
  const agents = reg.agents ?? [];
  const counts = {
    active: 0,
    degraded: 0,
    failed: 0,
    quarantined: 0,
    unknown: 0,
  };
  const intent_coverage: Record<string, string[]> = {};

  for (const a of agents) {
    const s = a.status ?? "unknown";
    if (s in counts) counts[s as keyof typeof counts]++;
    if (a.intents) {
      for (const intent of a.intents) {
        if (!intent_coverage[intent]) intent_coverage[intent] = [];
        intent_coverage[intent].push(a.id);
      }
    }
  }

  const readiness_pct =
    agents.length > 0 ? Math.round((counts.active / agents.length) * 100) : 0;

  return { total: agents.length, ...counts, readiness_pct, intent_coverage };
}

// ── MCP Server ────────────────────────────────────────────────────────────

const server = new Server(
  { name: "agent-registry-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_agents",
      description:
        "List all registered agents, optionally filtered by status or layer.",
      inputSchema: {
        type: "object",
        properties: {
          filter_status: { type: "string" },
          filter_layer: { type: "string" },
        },
      },
    },
    {
      name: "get_agent_capabilities",
      description: "Get full capability manifest for a specific agent by ID.",
      inputSchema: {
        type: "object",
        required: ["agent_id"],
        properties: { agent_id: { type: "string" } },
      },
    },
    {
      name: "update_agent_status",
      description: "Update an agent's status field in the registry.",
      inputSchema: {
        type: "object",
        required: ["agent_id", "status"],
        properties: {
          agent_id: { type: "string" },
          status: {
            type: "string",
            enum: ["unknown", "active", "degraded", "failed", "quarantined"],
          },
          extra: { type: "object" },
        },
      },
    },
    {
      name: "get_fallback_chain",
      description: "Resolve the full fallback chain for a given agent.",
      inputSchema: {
        type: "object",
        required: ["agent_id"],
        properties: { agent_id: { type: "string" } },
      },
    },
    {
      name: "check_authority",
      description:
        "Verify if an agent has at least the required layer authority.",
      inputSchema: {
        type: "object",
        required: ["agent_id", "required_layer"],
        properties: {
          agent_id: { type: "string" },
          required_layer: { type: "string" },
        },
      },
    },
    {
      name: "get_system_readiness",
      description:
        "Summarise overall system readiness and intent coverage map.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params;
  try {
    let result: unknown;
    switch (name) {
      case "list_agents":
        result = listAgents(
          args.filter_status as string,
          args.filter_layer as string,
        );
        break;
      case "get_agent_capabilities":
        result = getAgentCapabilities(args.agent_id as string);
        break;
      case "update_agent_status":
        result = updateAgentStatus(
          args.agent_id as string,
          args.status as AgentEntry["status"],
          args.extra as Partial<AgentEntry>,
        );
        break;
      case "get_fallback_chain":
        result = getFallbackChain(args.agent_id as string);
        break;
      case "check_authority":
        result = checkAuthority(
          args.agent_id as string,
          args.required_layer as string,
        );
        break;
      case "get_system_readiness":
        result = getSystemReadiness();
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

export const REGISTRATION = {
  id: "agent-registry-mcp",
  name: "AgentRegistryMCP",
  layer: "backbone",
  model_lane: "none",
  status: "unknown",
};

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

const expressPort = Number(process.env.MCP_AGENT_HTTP_PORT || 3002);
app.listen(expressPort, "127.0.0.1", () => {
  console.log("startup\\ntransport_ready\\nhealth_ready");
});



