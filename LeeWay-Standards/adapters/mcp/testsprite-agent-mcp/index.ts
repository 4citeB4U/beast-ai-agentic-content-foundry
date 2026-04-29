/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: MCP.AGENT.TESTING
TAG: MCP.AGENT.TESTSPRITE.SERVER

COLOR_ONION_HEX:
NEON=#76FF03
FLUO=#B2FF59
PASTEL=#F1F8E9

ICON_ASCII:
family=lucide
glyph=test-tubes

5WH:
WHAT = TestSprite MCP agent server — QA orchestration (preflight, unit, contract, E2E tests)
WHY = Provides Agent Lee with automated quality assurance across all test levels
WHO = Agent Lee OS — MCP System
WHERE = MCP agents/testsprite-agent-mcp/index.ts
WHEN = 2026
HOW = MCP SDK server exposing test runner tools over SSE transport with multi-level test phases

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
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import { Server as MCPServer } from "@modelcontextprotocol/sdk/server/index.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import http from "http";
import { promisify } from "util";
import { env, logAgentEvent } from "../shared/env";
import { existsSync, mkdirSync } from "fs";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

logAgentEvent("testsprite-agent-mcp", "startup", {
  message: "TestSpriteAgent MCP starting"
});

const execAsync = promisify(exec);
const CWD = process.cwd(); // Use current working directory for all operations

async function runShell(
  cmd: string,
): Promise<{ stdout: string; stderr: string; ok: boolean }> {
  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: CWD,
      timeout: 120_000,
      maxBuffer: 1024 * 1024 * 8,
    });
    return { stdout: stdout.trim(), stderr: stderr.trim(), ok: true };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string };
    return {
      stdout: (e.stdout ?? "").trim(),
      stderr: (e.stderr ?? String(err)).trim(),
      ok: false,
    };
  }
}

const TOOLS = [
  {
    name: "run_preflight",
    description: "Check all services are healthy before tests.",
    inputSchema: { type: "object" },
  },
  {
    name: "run_unit_tests",
    description: "Execute unit tests with Vitest.",
    inputSchema: { type: "object" },
  },
  {
    name: "run_contract_tests",
    description: "Validate API contracts against JSON schemas.",
    inputSchema: { type: "object" },
  },
  {
    name: "run_e2e_tests",
    description: "Run E2E browser tests via Playwright.",
    inputSchema: { type: "object" },
  },
  {
    name: "summarize_failures",
    description: "Produce a concise failure report from test output.",
    inputSchema: { type: "object" },
  },
  {
    name: "health_check",
    description: "Check agent health status.",
    inputSchema: { type: "object" },
  },
  {
    name: "authority_boundary",
    description: "Check agent authority boundary.",
    inputSchema: { type: "object" },
  },
];

async function main() {
  const LOG_DIR = path.resolve(__dirname, "../aaa-helper-agents/log");
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }

  const server = new MCPServer(
    { name: "testsprite-agent-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } },
  );
  process.on("uncaughtException", (err) => {
    logAgentEvent("testsprite-agent-mcp", "error", { error: String(err) });
  });
  process.on("SIGINT", () => {
    logAgentEvent("testsprite-agent-mcp", "shutdown", { message: "TestSpriteAgent MCP shutting down" });
    process.exit(0);
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req: any) => {
    const args = (req.params.arguments ?? {}) as Record<string, unknown>;
    let result: Record<string, unknown> = {};

    switch (req.params.name) {
      case "run_preflight": {
        const r = await runShell(
          "node Health-Check.ps1 2>&1 || pwsh -File Health-Check.ps1",
        );
        result = { ok: r.ok, output: r.stdout || r.stderr };
        logAgentEvent(
          "testsprite-agent-mcp",
          "run_preflight",
          result as object,
        );
        break;
      }
      case "run_unit_tests": {
        const pattern = args["pattern"] ? `-- "${args["pattern"]}"` : "";
        const coverage = args["coverage"] ? "--coverage" : "";
        const r = await runShell(
          `npx vitest run ${coverage} ${pattern}`.trim(),
        );
        result = { ok: r.ok, stdout: r.stdout, stderr: r.stderr };
        logAgentEvent(
          "testsprite-agent-mcp",
          "run_unit_tests",
          result as object,
        );
        break;
      }
      case "run_contract_tests": {
        const r = await runShell("npx vitest run tests/contracts");
        result = { ok: r.ok, stdout: r.stdout, stderr: r.stderr };
        logAgentEvent(
          "testsprite-agent-mcp",
          "run_contract_tests",
          result as object,
        );
        break;
      }
      case "health_check": {
        result = { status: "healthy", timestamp: new Date().toISOString() };
        logAgentEvent("testsprite-agent-mcp", "health_check", result);
        break;
      }
      case "authority_boundary": {
        result = { authorized: true, boundary: "specialty" };
        logAgentEvent("testsprite-agent-mcp", "authority_boundary", result);
        break;
      }
      case "run_e2e_tests": {
        const spec = args["spec_pattern"] ? `"${args["spec_pattern"]}"` : "";
        const headed = args["headed"] ? "--headed" : "";
        const r = await runShell(
          `npx playwright test ${spec} ${headed}`.trim(),
        );
        result = { ok: r.ok, stdout: r.stdout, stderr: r.stderr };
        logAgentEvent(
          "testsprite-agent-mcp",
          "run_e2e_tests",
          result as object,
        );
        break;
      }
      case "summarize_failures": {
        const output = String(args["test_output"] ?? "");
        const failures = output
          .split("\n")
          .filter(
            (l) => l.includes("FAIL") || l.includes("Error") || l.includes("✗"),
          )
          .slice(0, 30);
        result = {
          summary: failures.length
            ? failures.join("\n")
            : "No failures detected.",
          count: failures.length,
        };
        logAgentEvent(
          "testsprite-agent-mcp",
          "summarize_failures",
          result as object,
        );
        break;
      }
      default:
        throw new Error(`Unknown tool: ${req.params.name}`);
    }

    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });

  const HTTP_PORT = env("MCP_AGENT_HTTP_PORT") || 3101;
  const HTTP_HOST = env("MCP_AGENT_HTTP_HOST") || "127.0.0.1";
  const app = express();
  
  let sseTransport: SSEServerTransport;
  app.get("/sse", async (req, res) => {
    sseTransport = new SSEServerTransport("/message", res);
    await server.connect(sseTransport);
  });
  app.post("/message", async (req, res) => {
    if (sseTransport) await sseTransport.handlePostMessage(req, res);
  });
  
  app.get("/", (req, res) => res.json({status: "healthy"}));
  
  app.listen(Number(HTTP_PORT), HTTP_HOST, () => {
    console.log("startup\\ntransport_ready\\nhealth_ready");
    console.log(
      `TestSpriteAgent MCP HTTP/WS server running on http://${HTTP_HOST}:${HTTP_PORT}`,
    );
  });
}

main().catch((err) => {
  console.error("TestSpriteAgent MCP failed to start:", err);
});
