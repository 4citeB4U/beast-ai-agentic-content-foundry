#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.BUILD_GROUP_DEPENDENCY_MAP.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = build-group-dependency-map — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/build-group-dependency-map.mjs
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

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([".git", "node_modules", ".venv", "dist", "build", "coverage", "playwright-report", "test-results", "__pycache__", "__quarantine__"]);
const RESOLVE_EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function normalizeSpecifier(specifier) {
  return String(specifier || "").replaceAll("\\", "/").trim();
}

function normalizeAbs(absPath) {
  return path.resolve(absPath).replaceAll("\\", "/").toLowerCase();
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
    index.push({ file: fileAbs, specifiers: extractImportSpecifiers(text) });
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

function repoOf(relPath) {
  const parts = String(relPath || "").split("/");
  return parts[0] || "";
}

function classifyCoupling(entry) {
  if (entry.runtimeCritical) return "D";
  if (entry.importedByCount === 0 && entry.externalImportCount === 0) return "A";
  if (entry.peerCouplingCount > 0) return "C";
  return "B";
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function isRuntimeCritical(sourcePath, targetPath) {
  const s = String(sourcePath || "").toLowerCase();
  const t = String(targetPath || "").toLowerCase();
  return (
    s.includes("/runtime/")
    || s.includes("/rtc/")
    || s.includes("/engine/")
    || s.includes("/socket/")
    || s.includes("bridge")
    || s.includes("adapter")
    || s.includes("orchestrator")
    || s.endsWith("runtime.js")
    || t.includes("/runtime")
  );
}

async function run() {
  const groupId = process.argv.find((a) => a.startsWith("--group="))?.split("=")[1] || "G001";

  const expansionPath = path.join(docsRefactorDir, "group-resolution", `${groupId}-wildcard-expansion.csv`);
  const purgeLedgerPath = path.join(docsRefactorDir, "purge-ledger.csv");

  const expansionRows = await readCsvRows(expansionPath).catch(() => []);
  const purgeRows = await readCsvRows(purgeLedgerPath);
  const moveRows = purgeRows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");

  const concreteRows = [];
  const seen = new Set();
  for (const exp of expansionRows) {
    const sourcePath = String(exp.source_path || "").replaceAll("\\", "/");
    const targetPath = String(exp.target_path || "").replaceAll("\\", "/");
    const key = `${sourcePath}|${targetPath}`;
    if (!sourcePath || !targetPath || seen.has(key)) continue;
    seen.add(key);
    const row = moveRows.find(
      (r) => String(r.source_path || "") === sourcePath && String(r.target_path || "") === targetPath,
    );
    if (row) concreteRows.push(row);
  }

  const groupSourceSet = new Set(concreteRows.map((r) => normalizeAbs(path.resolve(workspaceRoot, r.source_path))));
  const importIndex = await buildImportIndex();

  const dependencyMap = [];
  for (const row of concreteRows) {
    const sourcePath = String(row.source_path || "");
    const targetPath = String(row.target_path || "");
    const sourceAbs = path.resolve(workspaceRoot, sourcePath);
    const sourceNorm = normalizeAbs(sourceAbs);
    const sourceRel = path.relative(workspaceRoot, sourceAbs).replaceAll("\\", "/");
    const sourceRepo = repoOf(sourceRel);

    const sourceEntry = importIndex.find((e) => normalizeAbs(e.file) === sourceNorm);
    const outboundSpecifiers = sourceEntry ? sourceEntry.specifiers : [];

    const outboundRefs = [];
    let externalImportCount = 0;
    let peerCouplingCount = 0;
    for (const spec of outboundSpecifiers) {
      const candidates = candidateResolvedPaths(sourceAbs, spec);
      if (candidates.length === 0) continue;
      const inGroup = candidates.some((c) => groupSourceSet.has(c));
      const outsideGroup = candidates.some((c) => !groupSourceSet.has(c));
      if (outsideGroup) externalImportCount += 1;
      if (inGroup) peerCouplingCount += 1;
      outboundRefs.push({ specifier: spec, inGroup, outsideGroup });
    }

    const inboundImporters = [];
    const externalImporters = [];
    for (const entry of importIndex) {
      const importerNorm = normalizeAbs(entry.file);
      if (importerNorm === sourceNorm) continue;
      let imported = false;
      for (const spec of entry.specifiers) {
        const candidates = candidateResolvedPaths(entry.file, spec);
        if (candidates.includes(sourceNorm)) {
          imported = true;
          break;
        }
      }
      if (!imported) continue;
      const importerRel = path.relative(workspaceRoot, entry.file).replaceAll("\\", "/");
      inboundImporters.push(importerRel);
      if (repoOf(importerRel) !== sourceRepo) externalImporters.push(importerRel);
    }

    const runtimeCritical = isRuntimeCritical(sourcePath, targetPath);
    const mapEntry = {
      file: sourcePath,
      target_path: targetPath,
      repo: String(row.repo || sourceRepo),
      risk: String(row.risk || ""),
      reason: String(row.reason || ""),
      imports: outboundRefs.map((x) => x.specifier),
      imported_by: inboundImporters,
      external_importers: externalImporters,
      imports_count: outboundRefs.length,
      imported_by_count: inboundImporters.length,
      external_importers_count: externalImporters.length,
      external_imports_count: externalImportCount,
      peer_coupling_count: peerCouplingCount,
      cross_repo: externalImporters.length > 0 || externalImportCount > 0,
      runtime_critical: runtimeCritical,
    };

    mapEntry.coupling_class = classifyCoupling({
      runtimeCritical,
      importedByCount: inboundImporters.length,
      externalImporterCount: externalImporters.length,
      externalImportCount,
      peerCouplingCount,
    });

    dependencyMap.push(mapEntry);
  }

  const outDir = path.join(docsRefactorDir, "group-resolution");
  await fs.mkdir(outDir, { recursive: true });

  const mapPath = path.join(outDir, `dependency-map-${groupId}.json`);
  await fs.writeFile(
    mapPath,
    `${JSON.stringify({ groupId, generatedAt: new Date().toISOString(), rows: dependencyMap.length, entries: dependencyMap }, null, 2)}\n`,
    "utf8",
  );

  const classes = ["A", "B", "C", "D"];
  for (const cls of classes) {
    const rows = dependencyMap.filter((r) => r.coupling_class === cls);
    const outCsv = path.join(outDir, `${groupId}-${cls}.csv`);
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
    for (const r of rows) {
      const rec = {
        group_id: `${groupId}-${cls}`,
        source_path: r.file,
        target_path: r.target_path,
        repo: r.repo,
        reason: r.reason,
        risk: r.risk,
        coupling_class: r.coupling_class,
        imports_count: r.imports_count,
        imported_by_count: r.imported_by_count,
        external_importers_count: r.external_importers_count,
        external_imports_count: r.external_imports_count,
        runtime_critical: r.runtime_critical,
        import_rewrite: "true",
      };
      lines.push(header.map((k) => csvEscape(rec[k])).join(","));
    }
    await fs.writeFile(outCsv, `${lines.join("\n")}\n`, "utf8");
  }

  const counts = dependencyMap.reduce((acc, r) => {
    acc[r.coupling_class] = (acc[r.coupling_class] || 0) + 1;
    return acc;
  }, {});

  console.log(JSON.stringify({
    groupId,
    sourceRows: expansionRows.length,
    executableRows: dependencyMap.length,
    byClass: counts,
    artifacts: {
      dependencyMap: path.relative(workspaceRoot, mapPath).replaceAll("\\", "/"),
      subgroupA: path.relative(workspaceRoot, path.join(outDir, `${groupId}-A.csv`)).replaceAll("\\", "/"),
      subgroupB: path.relative(workspaceRoot, path.join(outDir, `${groupId}-B.csv`)).replaceAll("\\", "/"),
      subgroupC: path.relative(workspaceRoot, path.join(outDir, `${groupId}-C.csv`)).replaceAll("\\", "/"),
      subgroupD: path.relative(workspaceRoot, path.join(outDir, `${groupId}-D.csv`)).replaceAll("\\", "/"),
    },
  }, null, 2));
}

await run();
