#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.APPLY_QUARANTINE_LEDGER.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = apply-quarantine-ledger — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/apply-quarantine-ledger.mjs
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
const workspaceRoot = process.env.LEEWAY_WORKSPACE_ROOT
  ? path.resolve(process.env.LEEWAY_WORKSPACE_ROOT)
  : path.resolve(standardsRoot, "..");

const ledgerPath = process.env.LEEWAY_PURGE_LEDGER
  ? path.resolve(process.env.LEEWAY_PURGE_LEDGER)
  : path.resolve(standardsRoot, "Docs", "refactor", "purge-ledger.csv");

const quarantineRoot = process.env.LEEWAY_QUARANTINE_ROOT
  ? path.resolve(process.env.LEEWAY_QUARANTINE_ROOT)
  : path.resolve(workspaceRoot, ".quarantine");

const dryRun = !process.argv.includes("--apply");

function parseCsv(text) {
  const lines = text.split(/\\r?\\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    if (cols.length !== headers.length) continue;
    const row = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = cols[c].trim();
    }
    rows.push(row);
  }
  return rows;
}

const ledgerText = await fs.readFile(ledgerPath, "utf8");
const rows = parseCsv(ledgerText);

const quarantineRows = rows.filter((r) => r.action.toUpperCase() === "QUARANTINE");

if (quarantineRows.length === 0) {
  console.log("No QUARANTINE rows in ledger.");
  process.exit(0);
}

for (const row of quarantineRows) {
  const sourceAbs = path.resolve(workspaceRoot, row.source_path);
  const targetAbs = path.resolve(quarantineRoot, row.quarantine_target);

  const sourceExists = await fs.stat(sourceAbs).then(() => true).catch(() => false);
  if (!sourceExists) {
    console.warn(`Missing source, skipped: ${row.source_path}`);
    continue;
  }

  console.log(`${dryRun ? "DRY" : "MOVE"}: ${row.source_path} -> ${path.relative(workspaceRoot, targetAbs).replaceAll("\\\\", "/")}`);

  if (dryRun) continue;

  await fs.mkdir(path.dirname(targetAbs), { recursive: true });
  await fs.rename(sourceAbs, targetAbs);
}

console.log(dryRun ? "Dry run complete. Use --apply to move files." : "Quarantine moves complete.");
