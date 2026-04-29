#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.RUN_EVOLUTION_CYCLE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = run-evolution-cycle — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/run-evolution-cycle.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");
const docsRefactorDir = path.join(standardsRoot, "Docs", "refactor");
const groupResolutionDir = path.join(docsRefactorDir, "group-resolution");

const GROUP = process.argv.find((arg) => arg.startsWith("--group="))?.split("=")[1] || "G001";
const MAX_DEPTH = Number.parseInt(process.argv.find((arg) => arg.startsWith("--max-depth="))?.split("=")[1] || "3", 10);
const BATCH_SIZE = Number.parseInt(process.argv.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1] || "200", 10);
const MAX_VISITS = Number.parseInt(process.argv.find((arg) => arg.startsWith("--max-visits="))?.split("=")[1] || "50000", 10);
const COMMAND_TIMEOUT_MS = Number.parseInt(process.argv.find((arg) => arg.startsWith("--command-timeout-ms="))?.split("=")[1] || "300000", 10);

const report = {
  group: GROUP,
  startedAt: new Date().toISOString(),
  result: "IN_PROGRESS",
  steps: [],
  safeGroupApplied: null,
  filesMoved: 0,
  nextBoundaryViolation: null,
  closureSeed: null,
  closureGroup: null,
  closureStatus: "NOT_STARTED",
  validationStatus: "UNKNOWN",
  validation: {
    preClosure: null,
    postClosure: null,
  },
  haltReason: null,
  artifacts: {
    cycleReport: path.relative(standardsRoot, path.join(docsRefactorDir, "cycle-report.json")).replaceAll("\\", "/"),
  },
};

function logStep(step, status, detail = {}) {
  report.steps.push({
    at: new Date().toISOString(),
    step,
    status,
    ...detail,
  });
}

function saveReportSync() {
  const outPath = path.join(docsRefactorDir, "cycle-report.json");
  const payload = {
    ...report,
    finishedAt: new Date().toISOString(),
    commandTimeoutMs: COMMAND_TIMEOUT_MS,
    "safe-group-applied": report.safeGroupApplied,
    "files-moved": report.filesMoved,
    "next-boundary-violation": report.nextBoundaryViolation,
    "closure-seed": report.closureSeed,
    "closure-status": report.closureStatus,
    "validation-status": report.validationStatus,
  };
  return fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function findLastJson(output) {
  const text = String(output || "").trim();
  if (!text) return null;
  for (let i = text.lastIndexOf("{"); i >= 0; i = text.lastIndexOf("{", i - 1)) {
    const candidate = text.slice(i);
    try {
      return JSON.parse(candidate);
    } catch {
      // keep scanning earlier '{'
    }
  }
  return null;
}

function runNode(step, args) {
  const cmd = "node";
  const fullArgs = [...args];
  try {
    const output = execFileSync(cmd, fullArgs, {
      cwd: standardsRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 1024 * 1024 * 50,
      timeout: COMMAND_TIMEOUT_MS,
    });
    logStep(step, "OK", { command: `${cmd} ${fullArgs.join(" ")}` });
    return { output, json: findLastJson(output) };
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : "";
    const stderr = error?.stderr ? String(error.stderr) : "";
    const output = [stdout, stderr].filter(Boolean).join("\n");
    logStep(step, "FAILED", {
      command: `${cmd} ${fullArgs.join(" ")}`,
      error: error?.message || "command failed",
      timedOut: Boolean(error?.signal === "SIGTERM" && String(error?.message || "").toLowerCase().includes("timed out")),
      output,
    });
    throw new Error(`${step} failed`);
  }
}

function asBlockingCount(summary) {
  return Number(summary?.blockingCount || 0);
}

async function readJson(relativePath) {
  const fullPath = path.join(standardsRoot, relativePath);
  const raw = await fs.readFile(fullPath, "utf8");
  return JSON.parse(raw);
}

async function pathExists(fullPath) {
  return fs.stat(fullPath).then(() => true).catch(() => false);
}

async function nextGroupName(letter) {
  const entries = await fs.readdir(groupResolutionDir).catch(() => []);
  let max = 1;
  const base = new RegExp(`^${GROUP}-${letter}\\.csv$`, "i");
  const numbered = new RegExp(`^${GROUP}-${letter}(\\d+)\\.csv$`, "i");

  for (const name of entries) {
    if (base.test(name)) max = Math.max(max, 1);
    const m = name.match(numbered);
    if (m) {
      max = Math.max(max, Number.parseInt(m[1], 10));
    }
  }

  return `${GROUP}-${letter}${max + 1}`;
}

function halt(reason) {
  report.result = "BLOCKED";
  report.haltReason = reason;
  report.validationStatus = "BLOCKED";
  throw new Error(reason);
}

function enforceValidationStop(label, payload) {
  const blockers = asBlockingCount(payload);
  if (blockers > 0) {
    halt(`${label} blockers > 0`);
  }
}

function buildSeedCsvRow(seedGroup, entry) {
  const columns = [
    "group_id",
    "source_path",
    "target_path",
    "repo",
    "reason",
    "risk",
    "coupling_class",
    "imports_count",
    "imported_by_count",
    "external_importers_count",
    "external_imports_count",
    "runtime_critical",
    "import_rewrite",
  ];
  const row = {
    group_id: seedGroup,
    source_path: String(entry.file || ""),
    target_path: String(entry.target_path || ""),
    repo: String(entry.repo || ""),
    reason: String(entry.reason || "boundary closure seed"),
    risk: String(entry.risk || "high"),
    coupling_class: "C-seed",
    imports_count: String(entry.imports_count ?? ""),
    imported_by_count: String(entry.imported_by_count ?? ""),
    external_importers_count: String(entry.external_importers_count ?? ""),
    external_imports_count: String(entry.external_imports_count ?? ""),
    runtime_critical: String(Boolean(entry.runtime_critical)),
    import_rewrite: "true",
  };

  const escape = (value) => {
    const raw = String(value ?? "");
    if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
      return `"${raw.replaceAll('"', '""')}"`;
    }
    return raw;
  };

  return `${columns.join(",")}\n${columns.map((key) => escape(row[key])).join(",")}\n`;
}

async function runValidation(label) {
  const scan = runNode(`${label}-scan`, ["./scripts/run-agents.mjs", "--mode=scan", "--scope=all"]);
  enforceValidationStop("scan", scan.json || {});

  const purgePlan = runNode(`${label}-purge-plan`, ["./scripts/run-agents.mjs", "--mode=purge-plan", "--scope=all"]);
  enforceValidationStop("purge-plan", purgePlan.json || {});

  const enforce = runNode(`${label}-enforce`, ["./scripts/run-agents.mjs", "--mode=enforce", "--scope=all"]);
  enforceValidationStop("enforce", enforce.json || {});

  return {
    status: "CLEAN",
    scan: scan.json || {},
    purgePlan: purgePlan.json || {},
    enforce: enforce.json || {},
  };
}

async function main() {
  await fs.mkdir(groupResolutionDir, { recursive: true });

  try {
    runNode("rebuild-dependency-map", ["./scripts/build-group-dependency-map.mjs", `--group=${GROUP}`]);

    const safeGroup = await nextGroupName("A");
    report.safeGroupApplied = safeGroup;

    runNode("generate-safe-microgroup", ["./scripts/generate-safe-microgroup.mjs", `--group=${GROUP}`, `--out=${safeGroup}`]);

    const safeApply = runNode("apply-safe-group", ["./scripts/run-agents.mjs", "--mode=move-group-apply", `--group=${safeGroup}`, "--apply"]);
    report.filesMoved = Number(safeApply.json?.summary?.moved || 0);

    report.validation.preClosure = await runValidation("pre-closure");

    const boundary = runNode("detect-boundary-violations", ["./scripts/detect-boundary-violations.mjs", `--group=${GROUP}`]);
    const topViolation = Array.isArray(boundary.json?.violations) ? boundary.json.violations[0] : null;

    if (!topViolation?.file) {
      report.closureStatus = "NO_BOUNDARY_VIOLATION";
      report.validation.postClosure = report.validation.preClosure;
      report.validationStatus = "CLEAN";
      report.result = "SUCCESS";
      await saveReportSync();
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    report.nextBoundaryViolation = topViolation.file;

    const closureGroup = await nextGroupName("C");
    const closureSeed = `${closureGroup}-seed`;
    report.closureGroup = closureGroup;
    report.closureSeed = closureSeed;

    const dependencyMap = await readJson(`Docs/refactor/group-resolution/dependency-map-${GROUP}.json`);
    const depEntry = (dependencyMap.entries || []).find((entry) => String(entry.file || "") === topViolation.file);

    if (!depEntry) {
      halt("source missing in dependency map for next boundary violation");
    }

    const seedCsv = buildSeedCsvRow(closureSeed, depEntry);
    const seedPath = path.join(groupResolutionDir, `${closureSeed}.csv`);
    await fs.writeFile(seedPath, seedCsv, "utf8");

    runNode("build-closure", [
      "./scripts/build-group-closure.mjs",
      `--seed=${closureSeed}`,
      `--out=${closureGroup}`,
      `--max-depth=${MAX_DEPTH}`,
      `--batch-size=${BATCH_SIZE}`,
      `--max-visits=${MAX_VISITS}`,
      `--partial-out=${closureGroup}-partial`,
    ]);

    const validationPath = path.join(groupResolutionDir, `closure-validation-${closureGroup}.json`);
    const hasValidation = await pathExists(validationPath);
    if (!hasValidation) {
      halt("closure validation artifact missing");
    }

    const closureValidation = await readJson(`Docs/refactor/group-resolution/closure-validation-${closureGroup}.json`);

    if (Number(closureValidation.seedMissingSize || 0) > 0) {
      report.closureStatus = "BLOCKED_SOURCE_MISSING";
      halt("source missing");
    }

    if (Number(closureValidation.closureIntegrity?.externalInboundViolationCount || 0) > 0) {
      report.closureStatus = "BLOCKED_EXTERNAL_INBOUND";
      halt("external inbound remains");
    }

    const closureDryRun = runNode("closure-dry-run", ["./scripts/run-agents.mjs", "--mode=move-group-apply", `--group=${closureGroup}`]);
    if (asBlockingCount(closureDryRun.json || {}) > 0) {
      report.closureStatus = "BLOCKED_DRY_RUN";
      halt("closure not sealed");
    }

    const sealed = Boolean(
      closureValidation.closureIntegrity?.isSelfContained
      && closureValidation.closureIntegrity?.isSingleTargetRepoBoundary,
    );

    if (!sealed) {
      report.closureStatus = "BLOCKED_NOT_SEALED";
      halt("closure not sealed");
    }

    const closureApply = runNode("closure-apply", ["./scripts/run-agents.mjs", "--mode=move-group-apply", `--group=${closureGroup}`, "--apply"]);
    if (asBlockingCount(closureApply.json || {}) > 0) {
      report.closureStatus = "BLOCKED_APPLY";
      halt("closure not sealed");
    }

    report.closureStatus = "APPLIED";

    report.validation.postClosure = await runValidation("post-closure");
    report.validationStatus = "CLEAN";
    report.result = "SUCCESS";
  } catch (error) {
    if (report.result === "IN_PROGRESS") {
      report.result = "FAILED";
      report.haltReason = error?.message || "unknown error";
      report.validationStatus = "BLOCKED";
    }
  }

  await saveReportSync();
  console.log(JSON.stringify(report, null, 2));

  if (report.result !== "SUCCESS") {
    process.exitCode = 1;
  }
}

await main();
