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
WHERE = src/agents/service/dead-code-reaper/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import path from "node:path";
import { makeReceipt, readCsvRows } from "../common/receipts.js";

export async function runDeadCodeReaper(ctx) {
  const ledgerPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  const rows = await readCsvRows(ledgerPath);

  const receipts = [];
  const grouped = rows.reduce((acc, row) => {
    const key = (row.action || "UNKNOWN").toUpperCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  receipts.push(
    makeReceipt({
      agent: "dead-code-reaper",
      severity: "info",
      pathValue: "Docs/refactor/purge-ledger.csv",
      issue: `Loaded purge ledger with ${rows.length} rows.`,
      action: "KEEP",
      details: { rows: rows.length, grouped },
    }),
  );

  for (const row of rows) {
    const action = (row.action || "").toUpperCase();
    const severity = action === "EXTERNALIZE" || action === "DELETE" ? "warn" : "info";
    receipts.push(
      makeReceipt({
        agent: "dead-code-reaper",
        severity,
        repo: row.repo,
        pathValue: row.source_path,
        issue: row.reason || "Ledger entry.",
        action: action || "KEEP",
        target: row.target_path || "n/a",
        autoFixable: action === "QUARANTINE",
      }),
    );
  }

  return receipts;
}
