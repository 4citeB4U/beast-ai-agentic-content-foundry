#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.RUN_AGENTS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = run-agents — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/run-agents.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import path from "node:path";
import { fileURLToPath } from "node:url";
import { appendReceipts } from "../src/agents/service/common/receipts.js";
import { runPlacementAuditor } from "../src/agents/service/placement-auditor/index.js";
import { runImportSentinel } from "../src/agents/service/import-sentinel/index.js";
import { runDeadCodeReaper } from "../src/agents/service/dead-code-reaper/index.js";
import { runQuarantineExecutor } from "../src/agents/service/quarantine-executor/index.js";
import { runContractIntegrity } from "../src/agents/service/contract-integrity/index.js";
import { runRuntimeChainGuardian } from "../src/agents/service/runtime-chain-guardian/index.js";
import { runDataLineageTracker } from "../src/agents/service/data-lineage-tracker/index.js";
import { runReceiptAudit } from "../src/agents/service/receipt-audit/index.js";
import { runHealthMonitor } from "../src/agents/service/health-monitor/index.js";
import { runRehomeOrchestrator, runRehomeAnalyzer, runRehomeApply, runRehomeGroupAnalyzer, runRehomeBlockerResolver, runRehomeGroupApply } from "../src/agents/service/rehome-orchestrator/index.js";
import { initializeStandardsAgentStatus, finalizeStandardsAgentStatus } from "../src/agents/service/common/standards-agent-supervisor.js";
import { LEEWAY_DOCTRINE } from "../src/agents/service/common/leeway-doctrine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");

function getArgValue(name, fallback = "") {
  const arg = process.argv.find((a) => a.startsWith(`${name}=`));
  if (!arg) return fallback;
  return arg.split("=")[1] || fallback;
}

const mode = getArgValue("--mode", "scan");
const scope = getArgValue("--scope", "standards");
const inputLedger = getArgValue("--input", "");
const groupId = getArgValue("--group", "");
const apply = process.argv.includes("--apply");
const receiptsDir = path.join(standardsRoot, "receipts");
const ctx = { standardsRoot, receiptsDir, scope, inputLedger, groupId };

async function runByMode() {
  const runState = await initializeStandardsAgentStatus({ receiptsDir, mode, scope });
  const receipts = [];

  if (mode === "scan") {
    receipts.push(...(await runPlacementAuditor(ctx)));
    receipts.push(...(await runImportSentinel(ctx)));
    receipts.push(...(await runContractIntegrity(ctx)));
    receipts.push(...(await runRuntimeChainGuardian(ctx)));
    receipts.push(...(await runDataLineageTracker(ctx)));
    receipts.push(...(await runReceiptAudit(ctx)));
    receipts.push(...(await runHealthMonitor(ctx)));
  } else if (mode === "purge-plan") {
    receipts.push(...(await runPlacementAuditor(ctx)));
    receipts.push(...(await runDeadCodeReaper(ctx)));
    receipts.push(...(await runDataLineageTracker(ctx)));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "enforce") {
    receipts.push(...(await runImportSentinel(ctx)));
    receipts.push(...(await runContractIntegrity(ctx)));
    receipts.push(...(await runRuntimeChainGuardian(ctx)));
  } else if (mode === "quarantine") {
    receipts.push(...(await runQuarantineExecutor(ctx, { apply })));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-simulate") {
    receipts.push(...(await runRehomeOrchestrator(ctx)));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-analyze") {
    receipts.push(...(await runRehomeAnalyzer(ctx)));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-apply") {
    receipts.push(...(await runRehomeApply(ctx, { apply })));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-group-analyze") {
    receipts.push(...(await runRehomeGroupAnalyzer(ctx)));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-resolve-blockers") {
    receipts.push(...(await runRehomeBlockerResolver(ctx, { apply })));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else if (mode === "move-group-apply") {
    receipts.push(...(await runRehomeGroupApply(ctx, { apply, groupId })));
    receipts.push(...(await runReceiptAudit(ctx)));
  } else {
    console.error(`Unsupported mode: ${mode}`);
    process.exitCode = 2;
    return;
  }

  await appendReceipts(receiptsDir, receipts);
  const statusResult = await finalizeStandardsAgentStatus({
    receiptsDir,
    mode,
    scope,
    startedAt: runState.startedAt,
    receipts,
  });

  const blocking = receipts.filter((r) => r.severity === "blocking");
  const summary = {
    mode,
    scope,
    leeWayDefinition: LEEWAY_DOCTRINE.oneLineDefinition,
    receiptCount: receipts.length,
    blockingCount: blocking.length,
    receiptsDir,
    standardsAgentStatusFile: statusResult.statusFile,
    standardsAgentSummary: statusResult.summary,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (blocking.length > 0) {
    process.exitCode = 1;
  }
}

await runByMode();
