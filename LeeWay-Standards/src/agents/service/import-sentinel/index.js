/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.INDEX.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = index — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/import-sentinel/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { spawn } from "node:child_process";
import path from "node:path";
import { makeReceipt } from "../common/receipts.js";

function runNodeScript(cwd, scriptPath) {
  return new Promise((resolve) => {
    const child = spawn("node", [scriptPath], { cwd, shell: false });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

export async function runImportSentinel(ctx) {
  const scriptPath = path.join(ctx.standardsRoot, "scripts", "check-layer-paths.mjs");
  const result = await runNodeScript(ctx.standardsRoot, scriptPath);

  if (result.code === 0) {
    return [
      makeReceipt({
        agent: "import-sentinel",
        severity: "info",
        pathValue: "scripts/check-layer-paths.mjs",
        issue: result.stdout.trim() || "Layer path validation passed.",
        action: "KEEP",
      }),
    ];
  }

  return [
    makeReceipt({
      agent: "import-sentinel",
      severity: "blocking",
      pathValue: "scripts/check-layer-paths.mjs",
      issue: (result.stderr || result.stdout || "Layer path validation failed.").trim(),
      action: "QUARANTINE",
      autoFixable: false,
    }),
  ];
}
