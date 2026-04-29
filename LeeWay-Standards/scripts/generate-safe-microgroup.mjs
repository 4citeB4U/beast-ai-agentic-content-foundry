#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.GENERATE_SAFE_MICROGROUP.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = generate-safe-microgroup — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/generate-safe-microgroup.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(standardsRoot, "..");
const docsRefactorDir = path.join(standardsRoot, "Docs", "refactor");
const groupResolutionDir = path.join(docsRefactorDir, "group-resolution");

function getArg(name, fallback = "") {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.split("=")[1] || fallback : fallback;
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

async function run() {
  const groupId = getArg("--group", "G001");
  const outGroup = getArg("--out", `${groupId}-A3`);
  const limit = Number.parseInt(getArg("--limit", "10"), 10);
  const sourceClass = getArg("--class", "D");

  const dependencyMapPath = path.join(groupResolutionDir, `dependency-map-${groupId}.json`);
  const raw = await fs.readFile(dependencyMapPath, "utf8");
  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const candidates = entries
    .filter((entry) => String(entry.coupling_class || "") === sourceClass)
    .filter((entry) => Number(entry.imported_by_count || 0) === 0)
    .filter((entry) => Number(entry.external_imports_count || 0) === 0)
    .sort((left, right) => {
      const leftScore = Number(left.imports_count || 0) + Number(left.imported_by_count || 0);
      const rightScore = Number(right.imports_count || 0) + Number(right.imported_by_count || 0);
      if (leftScore !== rightScore) return leftScore - rightScore;
      return String(left.file || "").localeCompare(String(right.file || ""));
    });

  const safe = [];
  const skippedMissing = [];
  for (const entry of candidates) {
    const sourceAbs = path.resolve(workspaceRoot, String(entry.file || ""));
    const exists = await fs.stat(sourceAbs).then(() => true).catch(() => false);
    if (!exists) {
      skippedMissing.push(entry.file);
      continue;
    }
    safe.push(entry);
    if (safe.length >= limit) break;
  }

  const outPath = path.join(groupResolutionDir, `${outGroup}.csv`);
  const header = [
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

  const lines = [header.join(",")];
  for (const entry of safe) {
    const row = {
      group_id: outGroup,
      source_path: entry.file,
      target_path: entry.target_path,
      repo: entry.repo,
      reason: entry.reason,
      risk: entry.risk,
      coupling_class: `${sourceClass}-micro`,
      imports_count: entry.imports_count,
      imported_by_count: entry.imported_by_count,
      external_importers_count: entry.external_importers_count,
      external_imports_count: entry.external_imports_count,
      runtime_critical: entry.runtime_critical,
      import_rewrite: "true",
    };
    lines.push(header.map((key) => csvEscape(row[key])).join(","));
  }

  await fs.writeFile(outPath, `${lines.join("\n")}\n`, "utf8");

  console.log(JSON.stringify({
    groupId,
    outGroup,
    dependencyMapPath,
    generatedCount: safe.length,
    skippedMissingCount: skippedMissing.length,
    skippedMissing,
    limit,
    sourceClass,
    outPath,
    files: safe.map((entry) => entry.file),
  }, null, 2));
}

await run();
