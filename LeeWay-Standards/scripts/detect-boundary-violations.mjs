#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.DETECT_BOUNDARY_VIOLATIONS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = detect-boundary-violations — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/detect-boundary-violations.mjs
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
const groupResolutionDir = path.join(standardsRoot, "Docs", "refactor", "group-resolution");

function getArg(name, fallback = "") {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  return arg ? arg.split("=")[1] || fallback : fallback;
}

function repoOf(filePath) {
  return String(filePath || "").split("/")[0] || "";
}

async function run() {
  const groupId = getArg("--group", "G001");
  const limit = Number.parseInt(getArg("--limit", "10"), 10);
  const dependencyMapPath = path.join(groupResolutionDir, `dependency-map-${groupId}.json`);
  const raw = await fs.readFile(dependencyMapPath, "utf8");
  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const violations = entries
    .filter((entry) => Number(entry.external_imports_count || 0) > 0 || Number(entry.external_importers_count || 0) > 0)
    .map((entry) => ({
      file: entry.file,
      current_repo: repoOf(entry.file),
      target_repo: repoOf(entry.target_path),
      external_imports_count: Number(entry.external_imports_count || 0),
      external_importers_count: Number(entry.external_importers_count || 0),
      imported_by_count: Number(entry.imported_by_count || 0),
      imports_count: Number(entry.imports_count || 0),
      likely_issue:
        Number(entry.external_importers_count || 0) > 0
          ? "cross-layer inbound dependency"
          : "cross-layer outbound dependency",
      coupling_class: entry.coupling_class,
      runtime_critical: Boolean(entry.runtime_critical),
      reason: entry.reason,
    }))
    .sort((left, right) => {
      const rightScore = right.external_imports_count + right.external_importers_count;
      const leftScore = left.external_imports_count + left.external_importers_count;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return String(left.file || "").localeCompare(String(right.file || ""));
    })
    .slice(0, limit);

  console.log(JSON.stringify({
    groupId,
    dependencyMapPath,
    violationCount: violations.length,
    violations,
  }, null, 2));
}

await run();
