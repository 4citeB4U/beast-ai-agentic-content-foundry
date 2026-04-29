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
WHERE = src/agents/service/placement-auditor/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import path from "node:path";
import { makeReceipt, readCsvRows } from "../common/receipts.js";

export async function runPlacementAuditor(ctx) {
  const matrixPath = path.join(ctx.standardsRoot, "Docs", "refactor", "ownership-matrix.csv");
  const rows = await readCsvRows(matrixPath);

  const receipts = [];
  receipts.push(
    makeReceipt({
      agent: "placement-auditor",
      severity: "info",
      pathValue: "Docs/refactor/ownership-matrix.csv",
      issue: `Loaded ownership matrix with ${rows.length} rows.`,
      action: "KEEP",
      details: { rows: rows.length },
    }),
  );

  for (const row of rows) {
    if ((row.quarantine_if_unresolved || "").toLowerCase() === "yes") {
      receipts.push(
        makeReceipt({
          agent: "placement-auditor",
          severity: "warn",
          repo: row.repo,
          pathValue: row.path_pattern,
          issue: "Path family is marked quarantine-if-unresolved.",
          action: "QUARANTINE",
          target: row.move_target_if_misplaced || "n/a",
          autoFixable: false,
        }),
      );
    }
  }

  return receipts;
}
