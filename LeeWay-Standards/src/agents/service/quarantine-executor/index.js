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
WHERE = src/agents/service/quarantine-executor/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import path from "node:path";
import fs from "node:fs/promises";
import { makeReceipt, readCsvRows } from "../common/receipts.js";

export async function runQuarantineExecutor(ctx, options = {}) {
  const apply = Boolean(options.apply);
  const ledgerPath = ctx.inputLedger
    ? (path.isAbsolute(ctx.inputLedger) ? ctx.inputLedger : path.join(ctx.standardsRoot, ctx.inputLedger))
    : path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");
  const quarantineRoot = path.join(workspaceRoot, "__quarantine__");
  const rows = await readCsvRows(ledgerPath);
  const quarantineRows = rows.filter((row) => (row.action || "").toUpperCase() === "QUARANTINE");

  if (quarantineRows.length === 0) {
    return [
      makeReceipt({
        agent: "quarantine-executor",
        severity: "info",
        pathValue: "Docs/refactor/purge-ledger.csv",
        issue: "No QUARANTINE rows in ledger.",
        action: "KEEP",
        details: { apply, matchedRows: 0 },
      }),
    ];
  }

  const moved = [];
  const missing = [];
  const skippedPatterns = [];
  for (const row of quarantineRows) {
    const sourceRelative = row.source_path.replaceAll("\\", "/");
    if (sourceRelative.includes("*") || sourceRelative.includes("?")) {
      skippedPatterns.push(sourceRelative);
      continue;
    }

    const sourceAbs = path.resolve(workspaceRoot, sourceRelative);
    const targetRelative = (row.target_path || path.join(row.repo, sourceRelative)).replaceAll("\\", "/");
    const targetAbs = path.resolve(quarantineRoot, targetRelative);

    const exists = await fs
      .stat(sourceAbs)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      missing.push(sourceRelative);
      continue;
    }

    if (apply) {
      await fs.mkdir(path.dirname(targetAbs), { recursive: true });
      await fs.rename(sourceAbs, targetAbs);
    }

    moved.push({ source: sourceRelative, target: targetRelative });
  }

  const issueParts = [];
  issueParts.push(`${apply ? "Applied" : "Dry-run"} quarantine for ${moved.length} row(s).`);
  if (missing.length > 0) {
    issueParts.push(`Missing ${missing.length} source path(s).`);
  }
  if (skippedPatterns.length > 0) {
    issueParts.push(`Skipped ${skippedPatterns.length} wildcard pattern row(s).`);
  }

  return [
    makeReceipt({
      agent: "quarantine-executor",
      severity: "info",
      pathValue: "Docs/refactor/purge-ledger.csv",
      issue: issueParts.join(" "),
      action: apply ? "QUARANTINE" : "KEEP",
      autoFixable: false,
      details: {
        apply,
        quarantineRoot,
        matchedRows: quarantineRows.length,
        moved,
        missing,
        skippedPatterns,
      },
    }),
  ];
}
