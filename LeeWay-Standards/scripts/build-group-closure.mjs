#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.BUILD_GROUP_CLOSURE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = build-group-closure — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/build-group-closure.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readCsvRows } from "../src/agents/service/common/receipts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");
const workspaceRoot = path.resolve(standardsRoot, "..");
const docsRefactorDir = path.join(standardsRoot, "Docs", "refactor");
const groupResolutionDir = path.join(docsRefactorDir, "group-resolution");

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([".git", "node_modules", ".venv", "dist", "build", "coverage", "playwright-report", "test-results", "__pycache__", "__quarantine__"]);
const RESOLVE_EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function normalizeSpecifier(specifier) {
  return String(specifier || "").replaceAll("\\", "/").trim();
}

function normalizeAbs(absPath) {
  return path.resolve(absPath).replaceAll("\\", "/").toLowerCase();
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function extractImportSpecifiers(text) {
  const values = [];
  const importRegex = /import\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g;
  const exportRegex = /export\s+\*\s+from\s+["']([^"']+)["']/g;
  const requireRegex = /require\(\s*["']([^"']+)["']\s*\)/g;

  for (const regex of [importRegex, exportRegex, requireRegex]) {
    let m = regex.exec(text);
    while (m) {
      values.push(normalizeSpecifier(m[1]));
      m = regex.exec(text);
    }
  }

  return values;
}

async function collectCodeFiles(currentAbs, out = []) {
  const entries = await fs.readdir(currentAbs, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullAbs = path.join(currentAbs, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await collectCodeFiles(fullAbs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (CODE_EXTS.has(ext)) out.push(fullAbs);
  }
  return out;
}

async function buildImportIndex() {
  const files = await collectCodeFiles(workspaceRoot);
  const index = [];
  for (const fileAbs of files) {
    const text = await fs.readFile(fileAbs, "utf8").catch(() => "");
    index.push({
      file: fileAbs,
      fileNorm: normalizeAbs(fileAbs),
      rel: path.relative(workspaceRoot, fileAbs).replaceAll("\\", "/"),
      specifiers: extractImportSpecifiers(text),
    });
  }
  return index;
}

function candidateResolvedPaths(importerAbs, specifier) {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized.startsWith(".")) return [];

  const importerDir = path.dirname(importerAbs);
  const base = path.resolve(importerDir, normalized);
  const candidates = new Set();
  for (const ext of RESOLVE_EXTS) {
    candidates.add(normalizeAbs(base + ext));
    if (ext) continue;
    for (const codeExt of RESOLVE_EXTS.slice(1)) {
      candidates.add(normalizeAbs(path.join(base, `index${codeExt}`)));
    }
  }
  return [...candidates];
}

function toRel(absPath) {
  return path.relative(workspaceRoot, absPath).replaceAll("\\", "/");
}

async function run() {
  const seedGroup = process.argv.find((a) => a.startsWith("--seed="))?.split("=")[1] || "G001-C";
  const outGroup = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] || "G001-C1";
  const maxDepth = Number.parseInt(process.argv.find((a) => a.startsWith("--max-depth="))?.split("=")[1] || "3", 10);
  const batchSize = Math.max(1, Number.parseInt(process.argv.find((a) => a.startsWith("--batch-size="))?.split("=")[1] || "200", 10));
  const maxVisits = Math.max(1, Number.parseInt(process.argv.find((a) => a.startsWith("--max-visits="))?.split("=")[1] || "50000", 10));
  const partialOutArg = process.argv.find((a) => a.startsWith("--partial-out="))?.split("=")[1] || "";
  const partialOutGroup = partialOutArg || `${outGroup}-partial`;

  const seedPath = path.join(groupResolutionDir, `${seedGroup}.csv`);
  const purgeLedgerPath = path.join(docsRefactorDir, "purge-ledger.csv");

  const seedRows = await readCsvRows(seedPath);
  const ledgerRows = await readCsvRows(purgeLedgerPath);
  const moveRows = ledgerRows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");

  const sourceToRow = new Map();
  for (const row of moveRows) {
    sourceToRow.set(String(row.source_path || "").replaceAll("\\", "/"), row);
  }

  const importIndex = await buildImportIndex();
  const allByNorm = new Map(importIndex.map((entry) => [entry.fileNorm, entry]));

  const outboundBySource = new Map();
  const inboundBySource = new Map();

  for (const sourcePath of sourceToRow.keys()) {
    const sourceAbs = path.resolve(workspaceRoot, sourcePath);
    const sourceNorm = normalizeAbs(sourceAbs);

    const sourceEntry = allByNorm.get(sourceNorm);
    const outboundAll = new Set();
    if (sourceEntry) {
      for (const specifier of sourceEntry.specifiers) {
        if (!specifier.startsWith(".")) continue;
        const candidates = candidateResolvedPaths(sourceAbs, specifier);
        for (const cand of candidates) {
          const entry = allByNorm.get(cand);
          if (entry) {
            outboundAll.add(entry.rel);
            break;
          }
        }
      }
    }
    outboundBySource.set(sourcePath, [...outboundAll]);

    const inboundAll = [];
    for (const importer of importIndex) {
      if (importer.fileNorm === sourceNorm) continue;
      let imported = false;
      for (const spec of importer.specifiers) {
        const candidates = candidateResolvedPaths(importer.file, spec);
        if (candidates.includes(sourceNorm)) {
          imported = true;
          break;
        }
      }
      if (imported) inboundAll.push(importer.rel);
    }
    inboundBySource.set(sourcePath, inboundAll);
  }

  const seedPaths = seedRows.map((r) => String(r.source_path || "").replaceAll("\\", "/")).filter(Boolean);
  const closure = new Set(seedPaths.filter((sourcePath) => sourceToRow.has(sourcePath)));
  const missingSeedSources = seedPaths.filter((sourcePath) => !sourceToRow.has(sourcePath));
  const queue = [...closure].map((sourcePath) => ({ sourcePath, depth: 0 }));
  const depthBySource = new Map(queue.map((item) => [item.sourcePath, 0]));
  let expansionStoppedByLimit = false;
  let totalVisits = 0;

  async function writeClosureCsv(outName, rows, groupTag) {
    const subgroupPath = path.join(groupResolutionDir, `${outName}.csv`);
    const subgroupHeader = [
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

    const subgroupLines = [subgroupHeader.join(",")];
    for (const row of rows) {
      const rec = {
        group_id: groupTag,
        source_path: String(row.source_path || ""),
        target_path: String(row.target_path || ""),
        repo: String(row.repo || ""),
        reason: String(row.reason || ""),
        risk: String(row.risk || ""),
        coupling_class: "closure",
        imports_count: "",
        imported_by_count: "",
        external_importers_count: "",
        external_imports_count: "",
        runtime_critical: "",
        import_rewrite: "true",
      };
      subgroupLines.push(subgroupHeader.map((h) => csvEscape(rec[h])).join(","));
    }

    await fs.writeFile(subgroupPath, `${subgroupLines.join("\n")}\n`, "utf8");
    return subgroupPath;
  }

  async function writePartialArtifact() {
    const partialRows = [...closure]
      .map((src) => sourceToRow.get(src))
      .filter(Boolean)
      .sort((a, b) => String(a.source_path || "").localeCompare(String(b.source_path || "")));

    const partialPath = await writeClosureCsv(partialOutGroup, partialRows, partialOutGroup);
    return {
      partialOutGroup,
      partialRows: partialRows.length,
      partialPath: path.relative(workspaceRoot, partialPath).replaceAll("\\", "/"),
    };
  }

  while (queue.length > 0) {
    if (totalVisits >= maxVisits) {
      expansionStoppedByLimit = true;
      break;
    }

    const batch = queue.splice(0, batchSize);
    for (const item of batch) {
      if (!item) continue;
      const current = item.sourcePath;
      const depth = item.depth;
      totalVisits += 1;

      console.error(`[closure] Expanding: ${current} at depth ${depth}`);
      if (depth >= maxDepth) continue;

      const inbound = inboundBySource.get(current) || [];
      for (const importerRel of inbound) {
        if (!sourceToRow.has(importerRel)) continue;
        if (closure.has(importerRel)) continue;
        closure.add(importerRel);
        depthBySource.set(importerRel, depth + 1);
        queue.push({ sourcePath: importerRel, depth: depth + 1 });
      }

      const outbound = outboundBySource.get(current) || [];
      for (const depRel of outbound) {
        if (!sourceToRow.has(depRel)) continue;
        if (closure.has(depRel)) continue;
        closure.add(depRel);
        depthBySource.set(depRel, depth + 1);
        queue.push({ sourcePath: depRel, depth: depth + 1 });
      }
    }

    await writePartialArtifact();
  }

  const closureRows = [...closure]
    .map((src) => sourceToRow.get(src))
    .filter(Boolean)
    .sort((a, b) => String(a.source_path || "").localeCompare(String(b.source_path || "")));

  const closureSet = new Set([...closure]);
  const externalInboundViolations = [];
  const externalOutboundViolations = [];

  for (const src of closureSet) {
    const inbound = inboundBySource.get(src) || [];
    const externalInbound = inbound.filter((x) => !closureSet.has(x));
    if (externalInbound.length > 0) {
      externalInboundViolations.push({ source: src, count: externalInbound.length, importers: externalInbound.slice(0, 25) });
    }

    const outbound = outboundBySource.get(src) || [];
    const externalOutbound = outbound.filter((x) => !closureSet.has(x));
    if (externalOutbound.length > 0) {
      externalOutboundViolations.push({ source: src, count: externalOutbound.length, dependencies: externalOutbound.slice(0, 25) });
    }
  }

  const targetRepos = [...new Set(closureRows.map((r) => String(r.target_path || "").split(/[\\/]/)[0]).filter(Boolean))];

  const validation = {
    seedGroup,
    outGroup,
    generatedAt: new Date().toISOString(),
    seedSize: seedRows.length,
    seedResolvedSize: closure.size,
    seedMissingSize: missingSeedSources.length,
    seedMissingSources: missingSeedSources,
    expansionConfig: {
      maxDepth,
      batchSize,
      maxVisits,
    },
    expansionProgress: {
      totalVisits,
      stoppedByLimit: expansionStoppedByLimit,
    },
    closureSize: closureRows.length,
    closureIntegrity: {
      externalInboundViolationCount: externalInboundViolations.length,
      externalOutboundViolationCount: externalOutboundViolations.length,
      targetRepoBoundaryCount: targetRepos.length,
      isSelfContained: externalInboundViolations.length === 0 && externalOutboundViolations.length === 0,
      isSingleTargetRepoBoundary: targetRepos.length === 1,
    },
    targetRepos,
    externalInboundViolations,
    externalOutboundViolations,
  };

  await fs.mkdir(groupResolutionDir, { recursive: true });

  const partialArtifact = await writePartialArtifact();
  const subgroupPath = await writeClosureCsv(outGroup, closureRows, outGroup);

  const validationPath = path.join(groupResolutionDir, `closure-validation-${outGroup}.json`);
  await fs.writeFile(validationPath, `${JSON.stringify(validation, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({
    seedGroup,
    outGroup,
    closureSize: closureRows.length,
    targetRepos,
    closureIntegrity: validation.closureIntegrity,
    artifacts: {
      subgroup: path.relative(workspaceRoot, subgroupPath).replaceAll("\\", "/"),
      partialSubgroup: partialArtifact.partialPath,
      validation: path.relative(workspaceRoot, validationPath).replaceAll("\\", "/"),
    },
  }, null, 2));
}

await run();
