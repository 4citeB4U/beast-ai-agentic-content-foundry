/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.RECEIPTS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = receipts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/common/receipts.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";

function now() {
  return Date.now();
}

export function makeReceipt({ agent, severity = "info", repo = "LeeWay-Standards", pathValue = "n/a", issue, action = "KEEP", target, autoFixable = false, details = {} }) {
  return {
    id: `${agent}-${now()}`,
    agent,
    severity,
    repo,
    path: pathValue,
    issue,
    action,
    target,
    autoFixable,
    ts: now(),
    details,
  };
}

export async function appendReceipts(receiptsDir, receipts) {
  await fs.mkdir(receiptsDir, { recursive: true });
  const ndjsonPath = path.join(receiptsDir, "ssa-receipts.ndjson");
  const latestPath = path.join(receiptsDir, "ssa-latest.json");

  if (receipts.length > 0) {
    const payload = `${receipts.map((r) => JSON.stringify(r)).join("\n")}\n`;
    await fs.appendFile(ndjsonPath, payload, "utf8");
  }

  const grouped = receipts.reduce((acc, receipt) => {
    acc[receipt.agent] = (acc[receipt.agent] || 0) + 1;
    return acc;
  }, {});

  await fs.writeFile(
    latestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: receipts.length,
        byAgent: grouped,
        receipts,
      },
      null,
      2,
    ),
    "utf8",
  );
}

export async function readCsvRows(csvPath) {
  function parseCell(cell) {
    const trimmed = String(cell ?? "").trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replaceAll('""', '"').trim();
    }
    return trimmed;
  }

  const text = await fs.readFile(csvPath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => parseCell(h));
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(",");
    if (cols.length !== headers.length) continue;
    const row = {};
    for (let c = 0; c < headers.length; c += 1) {
      row[headers[c]] = parseCell(cols[c]);
    }
    rows.push(row);
  }
  return rows;
}
