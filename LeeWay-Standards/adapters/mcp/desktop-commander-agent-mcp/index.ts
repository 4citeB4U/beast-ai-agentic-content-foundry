/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.DESKTOP
TAG: MCP.AGENT.DESKTOP.COMMANDER

COLOR_ONION_HEX:
NEON=#FF1744
FLUO=#FF4081
PASTEL=#FFCDD2

ICON_ASCII:
family=lucide
glyph=terminal

5WH:
WHAT = Desktop Commander MCP agent server — privileged host operations on Cerebral PC
WHY = Gives Agent Lee controlled access to launch apps, run terminal commands, and manage files
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/desktop-commander-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing host operation tools over SSE transport with path guard enforcement

AGENTS:
ASSESS
ALIGN
AUDIT
SHIELD

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
import "dotenv/config";
import { env } from "../shared/env";
import { captureState } from "./tools/capture-state.js";
import { killProcess } from "./tools/kill-process.js";
import { openApp } from "./tools/open-app.js";
import { readHostFile } from "./tools/read-file.js";
import { runTerminal } from "./tools/run-terminal.js";
import { writeHostFile } from "./tools/write-file.js";

const TOOLS = [
  {
    name: "open_app",
    description: "Launch an application by name or path.",
    inputSchema: { type: "object" },
  },
  {
    name: "run_terminal",
    description: "Run a shell command in an allowlisted working directory.",
    inputSchema: { type: "object" },
  },
  {
    name: "read_file",
    description: "Read a file from an allowlisted path.",
    inputSchema: { type: "object" },
  },
  {
    name: "write_file",
    description: "Write content to a file at an allowlisted path.",
    inputSchema: { type: "object" },
  },
  {
    name: "kill_process",
    description: "Terminate a process by name or PID.",
    inputSchema: { type: "object" },
  },
  {
    name: "capture_state",
    description: "Capture a system snapshot (processes, disk, memory).",
    inputSchema: { type: "object" },
  },
];

const PORT = env("MCP_AGENT_HTTP_PORT", "4011");
const HOST = env("MCP_AGENT_HTTP_HOST", "127.0.0.1");

const server = new MCPServer(
  { name: "desktop-commander-agent-mcp", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const args = (req.params.arguments ?? {}) as Record<string, unknown>;
  let result: unknown;
  switch (req.params.name) {
    case "open_app":
      result = await openApp(args);
      break;
    case "run_terminal":
      result = await runTerminal(args);
      break;
    case "read_file":
      result = await readHostFile(args);
      break;
    case "write_file":
      result = await writeHostFile(args);
      break;
    case "kill_process":
      result = await killProcess(args);
      break;
    case "capture_state":
      result = await captureState(args);
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

app.listen(Number(PORT), HOST, () => {
  console.log("startup\\ntransport_ready\\nhealth_ready");
  console.log(`DesktopCommanderAgent MCP HTTP/WS server running on http://${HOST}:${PORT}`);
});
