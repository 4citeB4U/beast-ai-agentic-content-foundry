/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.MEMORY
TAG: MCP.AGENT.MEMORY.SERVER

COLOR_ONION_HEX:
NEON=#7C4DFF
FLUO=#B388FF
PASTEL=#EDE7F6

ICON_ASCII:
family=lucide
glyph=archive

5WH:
WHAT = Memory MCP agent server — three-layer memory (session, InsForge cache, NotebookLM deep recall)
WHY = Provides Agent Lee with a persistent, searchable, multi-tier memory system
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/memory-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing read/write memory tools over SSE transport with layered storage

AGENTS:
ASSESS
ALIGN
AUDIT
ECHO

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
import { sessionStore } from "./lib/session-store.js";
import { buildContextPacket } from "./tools/build-context-packet.js";
import { compressSession } from "./tools/compress-session.js";
import { fetchRelatedEpisodes } from "./tools/fetch-related-episodes.js";
import { recallContext } from "./tools/recall-context.js";
import { writeSummary } from "./tools/write-summary.js";

const TOOLS = [
  {
    name: "recall_context",
    description:
      "3-layer memory recall: session → InsForge cache → NotebookLM deep. Pass utterance + session_id.",
    inputSchema: {
      type: "object",
      properties: {
        utterance: {
          type: "string",
          description: "The query or utterance to search memory for.",
        },
        session_id: {
          type: "string",
          description: "Active session identifier (default: 'default').",
        },
      },
    },
  },
  {
    name: "append_session",
    description: "Append a message to the Layer-1 in-memory session store.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { type: "string" },
        role: { type: "string", enum: ["user", "agent"] },
        content: { type: "string" },
      },
      required: ["session_id", "role", "content"],
    },
  },
  {
    name: "compress_session",
    description: "Summarize current session into a MemorySnapshot.",
    inputSchema: { type: "object" },
  },
  {
    name: "build_context_packet",
    description: "Assemble a full ContextPacket from session + memory.",
    inputSchema: { type: "object" },
  },
  {
    name: "write_summary",
    description: "Persist a MissionSummary to canonical memory.",
    inputSchema: { type: "object" },
  },
  {
    name: "fetch_related_episodes",
    description: "Retrieve past MissionSummaries related to utterance.",
    inputSchema: { type: "object" },
  },
];

const server = new MCPServer(
  { name: "memory-agent-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  let result: unknown;
  switch (req.params.name) {
    case "recall_context":
      result = await recallContext(args);
      break;
    case "append_session": {
      const msg = sessionStore.append(
        String(args["session_id"] ?? "default"),
        (args["role"] as "user" | "agent") ?? "user",
        String(args["content"] ?? ""),
      );
      result = { ok: true, id: msg.id };
      break;
    }
    case "compress_session":
      result = await compressSession(args);
      break;
    case "build_context_packet":
      result = await buildContextPacket(args);
      break;
    case "write_summary":
      result = await writeSummary(args);
      break;
    case "fetch_related_episodes":
      result = await fetchRelatedEpisodes(args);
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

const port = Number(process.env.MCP_AGENT_HTTP_PORT) || 3003;
const host = process.env.MCP_AGENT_HTTP_HOST || "127.0.0.1";
app.listen(port, host, () => {
  console.log("startup");
  console.log("transport_ready");
  console.log("health_ready");
});

