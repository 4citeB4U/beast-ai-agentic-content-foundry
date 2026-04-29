#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.RANK_EXTRACTION_CANDIDATES.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = rank-extraction-candidates — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/rank-extraction-candidates.mjs
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

async function run() {
  const groupId = getArg("--group", "G001");
  const limit = Number.parseInt(getArg("--limit", "20"), 10);
  const dependencyMapPath = path.join(groupResolutionDir, `dependency-map-${groupId}.json`);
  const raw = await fs.readFile(dependencyMapPath, "utf8");
  const payload = JSON.parse(raw);
  const entries = Array.isArray(payload.entries) ? payload.entries : [];

  const ranked = entries
    .map((entry) => ({
      file: entry.file,
      target_path: entry.target_path,
      coupling_class: entry.coupling_class,
      runtime_critical: Boolean(entry.runtime_critical),
      score:
        (Number(entry.imported_by_count || 0) * 2) +
        Number(entry.external_imports_count || 0) +
        Number(entry.imports_count || 0),
      imports_count: Number(entry.imports_count || 0),
      imported_by_count: Number(entry.imported_by_count || 0),
      external_imports_count: Number(entry.external_imports_count || 0),
      external_importers_count: Number(entry.external_importers_count || 0),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      return String(left.file || "").localeCompare(String(right.file || ""));
    })
    .slice(0, limit);

  console.log(JSON.stringify({
    groupId,
    dependencyMapPath,
    rankedCount: ranked.length,
    ranked,
  }, null, 2));
}

await run();
