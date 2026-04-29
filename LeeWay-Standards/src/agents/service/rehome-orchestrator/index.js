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
WHERE = src/agents/service/rehome-orchestrator/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { makeReceipt, readCsvRows } from "../common/receipts.js";

const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]);
const IGNORE_DIRS = new Set([".git", "node_modules", ".venv", "dist", "build", "coverage", "playwright-report", "test-results", "__pycache__"]);
const RESOLVE_EXTS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json"];

function toBoolString(value) {
  return String(value ?? "").trim().toLowerCase() === "true" ? "true" : "false";
}

function csvEscape(value) {
  const raw = String(value ?? "");
  if (raw.includes(",") || raw.includes('"') || raw.includes("\n") || raw.includes("\r")) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function extOf(sourcePath) {
  const base = path.basename(sourcePath || "");
  const ext = path.extname(base || "").toLowerCase();
  return ext || "(none)";
}

function isWildcardRow(row) {
  const value = String(row.source_path || "");
  return value.includes("*") || value.includes("?");
}

function moveCategory(row) {
  const role = String(row.current_role || "").toLowerCase();
  const reason = String(row.reason || "").toLowerCase();
  const target = String(row.target_path || "").toLowerCase();

  if (role === "runtime" || reason.includes("runtime") || target.includes("runtime")) {
    return "Runtime Misplacement";
  }
  if (role === "rtc" || reason.includes("transport") || target.includes("rtc") || target.includes("transport")) {
    return "Communication Misplacement";
  }
  if (role === "compute" || reason.includes("compute") || target.includes("gpu") || target.includes("worker")) {
    return "Compute Misplacement";
  }
  if (role === "governance" || reason.includes("law") || target.includes("standards")) {
    return "Governance Duplication";
  }
  if (role === "ui" || reason.includes("ui") || target.includes("/app")) {
    return "Shell/UI Misplacement";
  }
  return "Other Misplacement";
}

async function analyzeDependencyDepth(standardsRoot, sourcePath) {
  if (!sourcePath || sourcePath.includes("*") || sourcePath.includes("?")) {
    return { bucket: "wildcard", imports: -1 };
  }

  const absolute = path.resolve(standardsRoot, "..", sourcePath);
  const exists = await fs
    .stat(absolute)
    .then(() => true)
    .catch(() => false);

  if (!exists) {
    return { bucket: "missing", imports: -1 };
  }

  const ext = path.extname(absolute).toLowerCase();
  if (!CODE_EXTS.has(ext)) {
    return { bucket: "n/a", imports: 0 };
  }

  const text = await fs.readFile(absolute, "utf8").catch(() => "");
  const imports = (text.match(/\bimport\s+|\brequire\s*\(|\bexport\s+\*\s+from\b/g) || []).length;

  if (imports <= 2) return { bucket: "low", imports };
  if (imports <= 8) return { bucket: "medium", imports };
  return { bucket: "high", imports };
}

function normalizeSpecifier(specifier) {
  return String(specifier || "").replaceAll("\\", "/").trim();
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

async function collectCodeFiles(workspaceRoot, currentAbs = workspaceRoot, out = []) {
  const entries = await fs.readdir(currentAbs, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const fullAbs = path.join(currentAbs, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      await collectCodeFiles(workspaceRoot, fullAbs, out);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (CODE_EXTS.has(ext)) {
      out.push(fullAbs);
    }
  }
  return out;
}

function normalizeAbs(absPath) {
  return path.resolve(absPath).replaceAll("\\", "/").toLowerCase();
}

async function buildImportIndex(workspaceRoot) {
  const allCodeFiles = await collectCodeFiles(workspaceRoot);
  const importIndex = [];
  for (const fileAbs of allCodeFiles) {
    const text = await fs.readFile(fileAbs, "utf8").catch(() => "");
    importIndex.push({
      file: fileAbs,
      text,
      specifiers: extractImportSpecifiers(text),
    });
  }
  return importIndex;
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

function formatRelativeSpecifier(fromFileAbs, toFileAbs, originalSpecifier) {
  const original = normalizeSpecifier(originalSpecifier);
  let relative = path.relative(path.dirname(fromFileAbs), toFileAbs).replaceAll("\\", "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;

  if (path.extname(original)) {
    return relative;
  }

  for (const ext of RESOLVE_EXTS.slice(1)) {
    if (relative.endsWith(ext)) {
      relative = relative.slice(0, -ext.length);
      break;
    }
  }

  if (relative.endsWith("/index")) {
    relative = relative.slice(0, -"/index".length);
  }

  return relative;
}

function rewriteSpecifierInText(text, from, to) {
  if (!from || from === to) return text;
  const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .replace(new RegExp(`(from\\s+["'])${escaped}(["'])`, "g"), `$1${to}$2`)
    .replace(new RegExp(`(import\\s*["'])${escaped}(["'])`, "g"), `$1${to}$2`)
    .replace(new RegExp(`(require\\(\\s*["'])${escaped}(["']\\s*\\))`, "g"), `$1${to}$2`)
    .replace(new RegExp(`(export\\s+\\*\\s+from\\s+["'])${escaped}(["'])`, "g"), `$1${to}$2`);
}

async function ensureBackup(backupRoot, workspaceRoot, fileAbs) {
  const exists = await fs.stat(fileAbs).then(() => true).catch(() => false);
  if (!exists) return null;
  const rel = path.relative(workspaceRoot, fileAbs);
  const target = path.join(backupRoot, rel);
  const already = await fs.stat(target).then(() => true).catch(() => false);
  if (already) return target;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(fileAbs, target);
  return target;
}

function getPostMoveLocation(fileAbs, batchMap) {
  return batchMap.get(normalizeAbs(fileAbs)) || fileAbs;
}

function buildRewritePlanEntries(batchRows, analyses, importIndex, workspaceRoot) {
  const batchMap = new Map();
  for (const row of batchRows) {
    const sourceAbs = path.resolve(workspaceRoot, row.source_path);
    const targetAbs = path.resolve(workspaceRoot, row.target_path, path.basename(row.source_path));
    batchMap.set(normalizeAbs(sourceAbs), targetAbs);
  }

  const rewriteByFile = new Map();
  const analysisBySource = new Map(analyses.map((item) => [item.source, item]));

  function pushRewrite(fileAbs, from, to, metadata = {}) {
    if (!from || !to || from === to) return;
    const key = normalizeAbs(fileAbs);
    const existing = rewriteByFile.get(key) || {
      fileAbs,
      file: path.relative(workspaceRoot, fileAbs).replaceAll("\\", "/"),
      tier: metadata.tier || "Tier1",
      importsToRewrite: [],
    };

    if (!existing.importsToRewrite.some((entry) => entry.from === from && entry.to === to)) {
      existing.importsToRewrite.push({ from, to, ...metadata.extra });
    }
    rewriteByFile.set(key, existing);
  }

  for (const row of batchRows) {
    const analysis = analysisBySource.get(row.source_path);
    if (!analysis) continue;
    const sourceAbs = path.resolve(workspaceRoot, row.source_path);
    const targetAbs = path.resolve(workspaceRoot, row.target_path, path.basename(row.source_path));

    const sourceEntry = importIndex.find((entry) => normalizeAbs(entry.file) === normalizeAbs(sourceAbs));
    const specifiers = sourceEntry ? sourceEntry.specifiers : [];
    for (const specifier of specifiers) {
      if (!normalizeSpecifier(specifier).startsWith(".")) continue;
      const candidates = candidateResolvedPaths(sourceAbs, specifier);
      const matchedMovedTarget = [...batchMap.entries()].find(([oldAbs]) => candidates.includes(oldAbs));
      const dependencyTargetAbs = matchedMovedTarget ? matchedMovedTarget[1] : path.resolve(path.dirname(sourceAbs), normalizeSpecifier(specifier));
      const rewritten = formatRelativeSpecifier(targetAbs, dependencyTargetAbs, specifier);
      pushRewrite(targetAbs, specifier, rewritten, { tier: analysis.tier });
    }

    for (const importer of importIndex) {
      for (const specifier of importer.specifiers) {
        const candidates = candidateResolvedPaths(importer.file, specifier);
        if (!candidates.includes(normalizeAbs(sourceAbs))) continue;
        const importerPostMoveAbs = getPostMoveLocation(importer.file, batchMap);
        const rewritten = formatRelativeSpecifier(importerPostMoveAbs, targetAbs, specifier);
        pushRewrite(importerPostMoveAbs, specifier, rewritten, {
          tier: analysis.tier,
          extra: { movedDependency: row.source_path },
        });
      }
    }
  }

  return [...rewriteByFile.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function isRuntimeCritical(row) {
  const source = String(row.source_path || "").toLowerCase();
  const target = String(row.target_path || "").toLowerCase();
  const reason = String(row.reason || "").toLowerCase();
  return (
    source.includes("/runtime/") ||
    source.includes("/core/") ||
    source.includes("/engine/") ||
    source.includes("execution-chain") ||
    target.includes("/runtime") ||
    reason.includes("runtime")
  );
}

function isAdapterHeavy(row) {
  const source = String(row.source_path || "").toLowerCase();
  const target = String(row.target_path || "").toLowerCase();
  const reason = String(row.reason || "").toLowerCase();
  return (
    source.includes("adapter") ||
    source.includes("bridge") ||
    source.includes("transport") ||
    source.includes("rtc") ||
    target.includes("transport") ||
    target.includes("rtc") ||
    reason.includes("transport")
  );
}

function deriveTier({ category, depBucket, wildcard, runtimeCritical, adapterHeavy }) {
  if (wildcard || runtimeCritical || adapterHeavy || depBucket === "high") {
    return "Tier3";
  }

  const tier1Category = category === "Shell/UI Misplacement" || category === "Governance Duplication";
  const tier1Depth = depBucket === "low" || depBucket === "n/a";
  if (tier1Category && tier1Depth) {
    return "Tier1";
  }

  if (depBucket === "medium") {
    return "Tier2";
  }

  if (category === "Communication Misplacement" || category === "Compute Misplacement" || category === "Runtime Misplacement") {
    return "Tier2";
  }

  return "Tier2";
}

function withDotSlash(value) {
  if (!value) return "./";
  return value.startsWith(".") ? value : `./${value}`;
}

function relativeImportRewrite(oldFileAbs, newFileAbs, specifier) {
  const normalized = normalizeSpecifier(specifier);
  if (!normalized.startsWith(".")) {
    return null;
  }

  const oldDir = path.dirname(oldFileAbs);
  const oldResolved = path.resolve(oldDir, normalized);
  const newDir = path.dirname(newFileAbs);
  const rel = path.relative(newDir, oldResolved).replaceAll("\\", "/");
  return {
    from: normalized,
    to: withDotSlash(rel),
  };
}

async function analyzeMoveRow(row, standardsRoot, importIndex) {
  const workspaceRoot = path.resolve(standardsRoot, "..");
  const sourcePath = String(row.source_path || "");
  const sourceAbs = path.resolve(workspaceRoot, sourcePath);
  const wildcard = isWildcardRow(row);
  const category = moveCategory(row);
  const dep = await analyzeDependencyDepth(standardsRoot, sourcePath);
  const runtimeCritical = isRuntimeCritical(row);
  const adapterHeavy = isAdapterHeavy(row);
  const tier = deriveTier({
    category,
    depBucket: dep.bucket,
    wildcard,
    runtimeCritical,
    adapterHeavy,
  });

  const exists = await fs
    .stat(sourceAbs)
    .then(() => true)
    .catch(() => false);

  let outboundImports = 0;
  let inboundImports = 0;
  let importsToRewrite = [];
  let sourceText = "";
  const blockers = [];
  let crossRepoDependency = false;
  let crossRepoInboundDependency = false;

  if (wildcard) blockers.push("wildcard-pattern");
  if (!exists && !wildcard) blockers.push("missing-source");
  if (runtimeCritical) blockers.push("runtime-critical");
  if (adapterHeavy) blockers.push("adapter-heavy");
  if (dep.bucket === "high") blockers.push("high-dependency-depth");

  if (exists && CODE_EXTS.has(path.extname(sourceAbs).toLowerCase())) {
    sourceText = await fs.readFile(sourceAbs, "utf8").catch(() => "");
    const specifiers = extractImportSpecifiers(sourceText);
    outboundImports = specifiers.length;

    const fileName = path.basename(sourcePath);
    const fileStem = fileName.replace(path.extname(fileName), "").toLowerCase();
    const targetRepoName = String(row.target_path || "").split(/[\\/]/)[0] || "";
    const inboundMatches = importIndex.filter((entry) => {
      if (entry.file === sourceAbs) return false;
      return entry.specifiers.some((s) => {
        const low = s.toLowerCase();
        return low.includes(`/${fileStem}`) || low.endsWith(fileStem) || low.includes(fileStem);
      });
    });
    inboundImports = inboundMatches.length;

    for (const inbound of inboundMatches) {
      const inboundRel = path.relative(workspaceRoot, inbound.file).replaceAll("\\", "/");
      const inboundRepo = inboundRel.split("/")[0] || "";
      if (inboundRepo && targetRepoName && inboundRepo !== targetRepoName) {
        crossRepoInboundDependency = true;
        break;
      }
    }

    const targetDir = String(row.target_path || "");
    const newFileAbs = path.resolve(workspaceRoot, targetDir, path.basename(sourcePath));
    const targetRepoRoot = path.resolve(workspaceRoot, String(row.target_path || "").split(/[\\/]/)[0] || "");
    importsToRewrite = specifiers
      .map((s) => {
        const rewrite = relativeImportRewrite(sourceAbs, newFileAbs, s);
        if (!rewrite) return null;

        const candidates = candidateResolvedPaths(sourceAbs, s);
        const resolvedOutsideTargetRepo = candidates.some((candidate) => !normalizeAbs(candidate).startsWith(normalizeAbs(targetRepoRoot)));
        if (resolvedOutsideTargetRepo) {
          crossRepoDependency = true;
        }
        return rewrite;
      })
      .filter(Boolean);
  }

  if (crossRepoDependency) blockers.push("cross-repo-dependency");
  if (crossRepoInboundDependency) blockers.push("cross-repo-inbound");

  const requiresRewrite = toBoolString(row.import_rewrite) === "true" || importsToRewrite.length > 0;
  const safeToMove = tier === "Tier1" && blockers.length === 0;

  return {
    repo: String(row.repo || ""),
    source: sourcePath,
    target: String(row.target_path || ""),
    category,
    dependencyDepth: dep.bucket,
    tier,
    inboundImports,
    outboundImports,
    requiresRewrite,
    safeToMove,
    runtimeCritical,
    adapterHeavy,
    crossRepoDependency,
    crossRepoInboundDependency,
    blockers,
    importsToRewrite,
  };
}

async function writeGroupCsv(absPath, header, mapObj) {
  const lines = [header.join(",")];
  const rows = Object.entries(mapObj)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  for (const row of rows) {
    lines.push(`${csvEscape(row.key)},${row.count}`);
  }

  await fs.writeFile(absPath, `${lines.join("\n")}\n`, "utf8");
}

export async function runRehomeOrchestrator(ctx) {
  const ledgerPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const rows = await readCsvRows(ledgerPath);
  const moveRows = rows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");

  const byRepo = {};
  const byFileType = {};
  const byDepth = {};
  const byCategory = {};

  const moveMapPath = path.join(docsRefactorDir, "move-map.csv");
  const annotatedMapPath = path.join(docsRefactorDir, "move-map-annotated.csv");
  const starterDraftPath = path.join(docsRefactorDir, "move-map-starter-draft.csv");
  const mapHeader = [
    "repo",
    "source_path",
    "current_owner",
    "correct_owner",
    "target_path",
    "reason",
    "import_rewrite",
    "risk",
    "approved",
  ];
  const mapLines = [mapHeader.join(",")];
  const annotatedHeader = [...mapHeader, "category", "dependency_depth", "import_refs"];
  const annotatedLines = [annotatedHeader.join(",")];
  const starterRows = [];

  let wildcardCount = 0;
  let missingCount = 0;

  for (const row of moveRows) {
    const repo = String(row.repo || "");
    const sourcePath = String(row.source_path || "");
    const fileType = extOf(sourcePath);
    const category = moveCategory(row);

    byRepo[repo] = (byRepo[repo] || 0) + 1;
    byFileType[fileType] = (byFileType[fileType] || 0) + 1;
    byCategory[category] = (byCategory[category] || 0) + 1;

    const dep = await analyzeDependencyDepth(ctx.standardsRoot, sourcePath);
    byDepth[dep.bucket] = (byDepth[dep.bucket] || 0) + 1;
    if (dep.bucket === "wildcard") wildcardCount += 1;
    if (dep.bucket === "missing") missingCount += 1;

    mapLines.push(
      [
        row.repo,
        row.source_path,
        row.repo,
        row.correct_owner,
        row.target_path,
        row.reason,
        toBoolString(row.import_rewrite),
        row.risk,
        toBoolString(row.approved),
      ]
        .map(csvEscape)
        .join(","),
    );

    annotatedLines.push(
      [
        row.repo,
        row.source_path,
        row.repo,
        row.correct_owner,
        row.target_path,
        row.reason,
        toBoolString(row.import_rewrite),
        row.risk,
        toBoolString(row.approved),
        category,
        dep.bucket,
        dep.imports,
      ]
        .map(csvEscape)
        .join(","),
    );

    const starterEligibleCategory = category === "Shell/UI Misplacement" || category === "Governance Duplication";
    const starterEligibleDepth = dep.bucket === "low" || dep.bucket === "n/a";
    if (!isWildcardRow(row) && starterEligibleCategory && starterEligibleDepth) {
      starterRows.push({
        row,
        category,
        depBucket: dep.bucket,
        depImports: dep.imports,
      });
    }
  }

  await fs.mkdir(docsRefactorDir, { recursive: true });
  await fs.writeFile(moveMapPath, `${mapLines.join("\n")}\n`, "utf8");
  await fs.writeFile(annotatedMapPath, `${annotatedLines.join("\n")}\n`, "utf8");

  const starterHeader = [...annotatedHeader];
  const starterLines = [starterHeader.join(",")];
  const starterTop = starterRows
    .sort((a, b) => {
      if (a.depBucket === b.depBucket) return a.depImports - b.depImports;
      if (a.depBucket === "n/a") return -1;
      if (b.depBucket === "n/a") return 1;
      return a.depBucket.localeCompare(b.depBucket);
    })
    .slice(0, 50);

  for (const entry of starterTop) {
    starterLines.push(
      [
        entry.row.repo,
        entry.row.source_path,
        entry.row.repo,
        entry.row.correct_owner,
        entry.row.target_path,
        entry.row.reason,
        toBoolString(entry.row.import_rewrite),
        entry.row.risk,
        toBoolString(entry.row.approved),
        entry.category,
        entry.depBucket,
        entry.depImports,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  await fs.writeFile(starterDraftPath, `${starterLines.join("\n")}\n`, "utf8");

  const byRepoPath = path.join(docsRefactorDir, "move-candidates-by-repo.csv");
  const byFileTypePath = path.join(docsRefactorDir, "move-candidates-by-filetype.csv");
  const byDepthPath = path.join(docsRefactorDir, "move-candidates-by-dependency-depth.csv");
  const byCategoryPath = path.join(docsRefactorDir, "move-candidates-by-category.csv");

  await writeGroupCsv(byRepoPath, ["repo", "count"], byRepo);
  await writeGroupCsv(byFileTypePath, ["file_type", "count"], byFileType);
  await writeGroupCsv(byDepthPath, ["dependency_depth", "count"], byDepth);
  await writeGroupCsv(byCategoryPath, ["category", "count"], byCategory);

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: "info",
      pathValue: "Docs/refactor/move-map.csv",
      issue: `MOVE simulation prepared ${moveRows.length} row(s), grouped by repo/file type/dependency depth/category.`,
      action: "KEEP",
      details: {
        moveRows: moveRows.length,
        wildcardRows: wildcardCount,
        missingRows: missingCount,
        artifacts: {
          moveMap: "Docs/refactor/move-map.csv",
          moveMapAnnotated: "Docs/refactor/move-map-annotated.csv",
          moveMapStarterDraft: "Docs/refactor/move-map-starter-draft.csv",
          byRepo: "Docs/refactor/move-candidates-by-repo.csv",
          byFileType: "Docs/refactor/move-candidates-by-filetype.csv",
          byDependencyDepth: "Docs/refactor/move-candidates-by-dependency-depth.csv",
          byCategory: "Docs/refactor/move-candidates-by-category.csv",
          starterDraftCount: starterTop.length,
        },
      },
    }),
  ];
}

export async function runRehomeAnalyzer(ctx) {
  const ledgerPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const rows = await readCsvRows(ledgerPath);
  const moveRows = rows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");

  const importIndex = await buildImportIndex(workspaceRoot);

  const analyses = [];
  for (const row of moveRows) {
    analyses.push(await analyzeMoveRow(row, ctx.standardsRoot, importIndex));
  }

  const tierHeader = [
    "repo",
    "source_path",
    "current_owner",
    "correct_owner",
    "target_path",
    "reason",
    "import_rewrite",
    "risk",
    "approved",
    "tier",
    "category",
    "dependency_depth",
  ];
  const tierLines = [tierHeader.join(",")];

  for (let i = 0; i < moveRows.length; i += 1) {
    const row = moveRows[i];
    const analysis = analyses[i];
    tierLines.push(
      [
        row.repo,
        row.source_path,
        row.repo,
        row.correct_owner,
        row.target_path,
        row.reason,
        toBoolString(row.import_rewrite),
        row.risk,
        toBoolString(row.approved),
        analysis.tier,
        analysis.category,
        analysis.dependencyDepth,
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const tieredMapPath = path.join(docsRefactorDir, "move-map-tiered.csv");
  await fs.mkdir(docsRefactorDir, { recursive: true });
  await fs.writeFile(tieredMapPath, `${tierLines.join("\n")}\n`, "utf8");

  const tier1Rows = analyses.filter((a) => a.tier === "Tier1" && a.safeToMove && !a.runtimeCritical && !a.adapterHeavy && !a.source.includes("*") && !a.source.includes("?"));
  const batchHeader = ["repo", "source_path", "current_owner", "correct_owner", "target_path", "reason", "import_rewrite", "risk", "approved", "tier"];
  const batchLines = [batchHeader.join(",")];
  for (const row of tier1Rows) {
    const original = moveRows.find((r) => String(r.source_path || "") === row.source && String(r.target_path || "") === row.target);
    if (!original) continue;
    batchLines.push(
      [
        original.repo,
        original.source_path,
        original.repo,
        original.correct_owner,
        original.target_path,
        original.reason,
        toBoolString(original.import_rewrite),
        original.risk,
        toBoolString(original.approved),
        row.tier,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const batchPath = path.join(docsRefactorDir, "move-batch-001.csv");
  await fs.writeFile(batchPath, `${batchLines.join("\n")}\n`, "utf8");

  const tierCounts = analyses.reduce((acc, row) => {
    acc[row.tier] = (acc[row.tier] || 0) + 1;
    return acc;
  }, {});
  const tierBreakdownPath = path.join(docsRefactorDir, "move-tier-breakdown.csv");
  await writeGroupCsv(tierBreakdownPath, ["tier", "count"], tierCounts);

  const analyzeOutput = analyses.map((row) => ({
    source: row.source,
    target: row.target,
    inboundImports: row.inboundImports,
    outboundImports: row.outboundImports,
    requiresRewrite: row.requiresRewrite,
    safeToMove: row.safeToMove,
    tier: row.tier,
    blockers: row.blockers,
  }));
  const analyzeOutputPath = path.join(docsRefactorDir, "move-analyze-output.json");
  await fs.writeFile(analyzeOutputPath, `${JSON.stringify(analyzeOutput, null, 2)}\n`, "utf8");

  const rewritePlan = buildRewritePlanEntries(moveRows, analyses, importIndex, workspaceRoot);
  const rewritePlanPath = path.join(docsRefactorDir, "move-rewrite-plan.json");
  await fs.writeFile(rewritePlanPath, `${JSON.stringify(rewritePlan, null, 2)}\n`, "utf8");

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: "info",
      pathValue: "Docs/refactor/move-map-tiered.csv",
      issue: `MOVE analysis completed for ${analyses.length} row(s); Tier1 ready rows: ${tier1Rows.length}.`,
      action: "KEEP",
      details: {
        analyzedRows: analyses.length,
        tierCounts,
        tier1ReadyRows: tier1Rows.length,
        artifacts: {
          tieredMap: "Docs/refactor/move-map-tiered.csv",
          tierBreakdown: "Docs/refactor/move-tier-breakdown.csv",
          moveBatch001: "Docs/refactor/move-batch-001.csv",
          analyzeOutput: "Docs/refactor/move-analyze-output.json",
          rewritePlan: "Docs/refactor/move-rewrite-plan.json",
        },
      },
    }),
  ];
}

export async function runRehomeApply(ctx, options = {}) {
  const apply = Boolean(options.apply);
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const ledgerPath = ctx.inputLedger
    ? (path.isAbsolute(ctx.inputLedger) ? ctx.inputLedger : path.join(ctx.standardsRoot, ctx.inputLedger))
    : path.join(docsRefactorDir, "move-batch-001.csv");
  const rows = await readCsvRows(ledgerPath);

  if (rows.length === 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "info",
        pathValue: "Docs/refactor/move-batch-001.csv",
        issue: "No MOVE rows in batch.",
        action: "KEEP",
        details: { apply, matchedRows: 0 },
      }),
    ];
  }

  const importIndex = await buildImportIndex(workspaceRoot);
  const analyses = [];
  for (const row of rows) {
    analyses.push(await analyzeMoveRow(row, ctx.standardsRoot, importIndex));
  }

  const invalidRows = analyses.filter((row) => row.tier !== "Tier1" || !row.safeToMove);
  if (invalidRows.length > 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: path.relative(ctx.standardsRoot, ledgerPath).replaceAll("\\", "/"),
        issue: `MOVE apply blocked: ${invalidRows.length} row(s) are not safe Tier1 candidates.`,
        action: "KEEP",
        details: {
          apply,
          invalidRows: invalidRows.map((row) => ({ source: row.source, tier: row.tier, blockers: row.blockers })),
        },
      }),
    ];
  }

  const rewritePlan = buildRewritePlanEntries(rows, analyses, importIndex, workspaceRoot);
  const rewritePlanPath = path.join(docsRefactorDir, "move-rewrite-plan.json");
  await fs.writeFile(rewritePlanPath, `${JSON.stringify(rewritePlan, null, 2)}\n`, "utf8");

  const timestamp = Date.now();
  const backupRoot = path.join(ctx.receiptsDir, "move-apply-backups", String(timestamp));
  const sourceTargets = [];
  const seenTargets = new Set();
  const collisions = [];

  for (const row of rows) {
    const sourceAbs = path.resolve(workspaceRoot, row.source_path);
    const targetAbs = path.resolve(workspaceRoot, row.target_path, path.basename(row.source_path));
    const targetKey = normalizeAbs(targetAbs);
    if (seenTargets.has(targetKey)) {
      collisions.push({ source: row.source_path, target: targetAbs });
      continue;
    }
    seenTargets.add(targetKey);

    const targetExists = await fs.stat(targetAbs).then(() => true).catch(() => false);
    if (targetExists) {
      collisions.push({ source: row.source_path, target: targetAbs });
      continue;
    }
    sourceTargets.push({ row, sourceAbs, targetAbs });
  }

  if (collisions.length > 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: path.relative(ctx.standardsRoot, ledgerPath).replaceAll("\\", "/"),
        issue: `MOVE apply blocked: ${collisions.length} target collision(s) detected.`,
        action: "KEEP",
        details: { apply, collisions },
      }),
    ];
  }

  const missing = [];
  const moved = [];
  const rewrittenFiles = [];

  for (const item of sourceTargets) {
    const exists = await fs.stat(item.sourceAbs).then(() => true).catch(() => false);
    if (!exists) {
      missing.push(item.row.source_path);
      continue;
    }
    if (apply) {
      await ensureBackup(backupRoot, workspaceRoot, item.sourceAbs);
    }
  }

  for (const planEntry of rewritePlan) {
    const planFileAbs = path.resolve(workspaceRoot, planEntry.file);
    if (apply) {
      await ensureBackup(backupRoot, workspaceRoot, planFileAbs);
    }
  }

  if (apply) {
    for (const item of sourceTargets) {
      const exists = await fs.stat(item.sourceAbs).then(() => true).catch(() => false);
      if (!exists) continue;
      await fs.mkdir(path.dirname(item.targetAbs), { recursive: true });
      await fs.rename(item.sourceAbs, item.targetAbs);
      moved.push({
        source: item.row.source_path,
        target: path.relative(workspaceRoot, item.targetAbs).replaceAll("\\", "/"),
      });
    }

    for (const planEntry of rewritePlan) {
      const fileAbs = path.resolve(workspaceRoot, planEntry.file);
      const exists = await fs.stat(fileAbs).then(() => true).catch(() => false);
      if (!exists) continue;
      let text = await fs.readFile(fileAbs, "utf8").catch(() => "");
      const before = text;
      for (const rewrite of planEntry.importsToRewrite) {
        text = rewriteSpecifierInText(text, rewrite.from, rewrite.to);
      }
      if (text !== before) {
        await fs.writeFile(fileAbs, text, "utf8");
        rewrittenFiles.push({ file: planEntry.file, rewrites: planEntry.importsToRewrite.length });
      }
    }
  }

  const rollbackPlanPath = path.join(docsRefactorDir, "move-rollback-plan.json");
  const rollbackPlan = {
    generatedAt: new Date(timestamp).toISOString(),
    backupRoot: path.relative(workspaceRoot, backupRoot).replaceAll("\\", "/"),
    moves: sourceTargets.map((item) => ({
      source: item.row.source_path,
      target: path.relative(workspaceRoot, item.targetAbs).replaceAll("\\", "/"),
    })),
    rewrittenFiles: rewritePlan.map((entry) => entry.file),
  };
  await fs.writeFile(rollbackPlanPath, `${JSON.stringify(rollbackPlan, null, 2)}\n`, "utf8");

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: missing.length > 0 ? "warn" : "info",
      pathValue: path.relative(ctx.standardsRoot, ledgerPath).replaceAll("\\", "/"),
      issue: `${apply ? "Applied" : "Dry-run"} MOVE batch for ${moved.length || sourceTargets.length - missing.length} row(s).`,
      action: apply ? "MOVE" : "KEEP",
      details: {
        apply,
        matchedRows: rows.length,
        moved,
        missing,
        rewrittenFiles,
        rewritePlan: "Docs/refactor/move-rewrite-plan.json",
        rollbackPlan: "Docs/refactor/move-rollback-plan.json",
        backupRoot: path.relative(workspaceRoot, backupRoot).replaceAll("\\", "/"),
      },
    }),
  ];
}

// ─── Phase 4: Coordinated Structural Recomposition ───────────────────────────
// Rule: No more single-file MOVE operations.
//       All future moves must be group-based and dependency-aware.

function buildDependencyGroups(analyses, workspaceRoot) {
  // Build adjacency using shared stem-level imports between candidates
  const nodeMap = new Map(); // source -> analysis
  for (const a of analyses) {
    nodeMap.set(a.source, a);
  }

  const visited = new Set();
  const groups = [];

  function collectGroup(startSource, group) {
    if (visited.has(startSource)) return;
    visited.add(startSource);
    const node = nodeMap.get(startSource);
    if (!node) return;
    group.push(node);

    // Pull in any candidate that shares inbound coupling with this node
    // (i.e. their basename/stem appears in this node's outbound specifiers,
    //  OR this node's basename/stem appears in that candidate's outbound specifiers)
    const startStem = path.basename(startSource, path.extname(startSource)).toLowerCase();

    for (const [otherSource, other] of nodeMap.entries()) {
      if (visited.has(otherSource)) continue;

      // Check if other imports start, or start imports other
      const otherStem = path.basename(otherSource, path.extname(otherSource)).toLowerCase();
      const otherImportsStart = other.importsToRewrite.some((rw) => rw.from.toLowerCase().includes(startStem));
      const startImportsOther = node.importsToRewrite.some((rw) => rw.from.toLowerCase().includes(otherStem));

      // Also group files that share the same target repo (they'll need coordinated rewrites)
      const sameTarget = node.target && other.target && node.target.split(/[/\\]/)[0] === other.target.split(/[/\\]/)[0];
      const sameSourceRepo = node.source.split("/")[0] === other.source.split("/")[0];

      if (otherImportsStart || startImportsOther || (sameTarget && sameSourceRepo)) {
        collectGroup(otherSource, group);
      }
    }
  }

  for (const source of nodeMap.keys()) {
    if (!visited.has(source)) {
      const group = [];
      collectGroup(source, group);
      groups.push(group);
    }
  }

  return groups;
}

function scoreGroupRisk(group) {
  // Higher = harder to move
  let score = 0;
  for (const node of group) {
    if (node.blockers.length > 0) score += node.blockers.length * 10;
    if (node.crossRepoDependency) score += 5;
    if (node.crossRepoInboundDependency) score += 5;
    if (node.runtimeCritical) score += 20;
    if (node.adapterHeavy) score += 10;
    if (node.requiresRewrite) score += 2;
    score += node.inboundImports + node.outboundImports;
  }
  return score;
}

export async function runRehomeGroupAnalyzer(ctx) {
  const PHASE_4_RULE = "No more single-file MOVE operations. All future moves must be group-based and dependency-aware.";
  const ledgerPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const rows = await readCsvRows(ledgerPath);
  const moveRows = rows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");

  const importIndex = await buildImportIndex(workspaceRoot);

  const analyses = [];
  for (const row of moveRows) {
    analyses.push(await analyzeMoveRow(row, ctx.standardsRoot, importIndex));
  }

  // Only candidates that exist on disk (skip missing-source — they need prior restore)
  const viable = analyses.filter((a) => !a.blockers.includes("missing-source"));

  const groups = buildDependencyGroups(viable, workspaceRoot);

  // Sort groups: safest first (lowest risk score), then by size
  groups.sort((a, b) => {
    const riskDiff = scoreGroupRisk(a) - scoreGroupRisk(b);
    if (riskDiff !== 0) return riskDiff;
    return a.length - b.length;
  });

  const groupSummaries = groups.map((group, idx) => {
    const allBlockerFree = group.every((n) => n.blockers.length === 0);
    const anyBlockers = group.flatMap((n) => n.blockers);
    const targetRepos = [...new Set(group.map((n) => (n.target || "").split(/[/\\]/)[0]).filter(Boolean))];
    const sourceRepos = [...new Set(group.map((n) => n.source.split("/")[0]).filter(Boolean))];
    return {
      groupId: `G${String(idx + 1).padStart(3, "0")}`,
      size: group.length,
      sources: group.map((n) => n.source),
      targetRepos,
      sourceRepos,
      allBlockerFree,
      blockers: anyBlockers,
      riskScore: scoreGroupRisk(group),
      requiresRewrite: group.some((n) => n.requiresRewrite),
      crossRepoDependency: group.some((n) => n.crossRepoDependency),
      crossRepoInboundDependency: group.some((n) => n.crossRepoInboundDependency),
    };
  });

  const readyGroups = groupSummaries.filter((g) => g.allBlockerFree);
  const blockedGroups = groupSummaries.filter((g) => !g.allBlockerFree);

  // Write group analysis artifacts
  const groupOutputPath = path.join(docsRefactorDir, "move-group-analysis.json");
  await fs.mkdir(docsRefactorDir, { recursive: true });
  await fs.writeFile(
    groupOutputPath,
    `${JSON.stringify({ phase: 4, rule: PHASE_4_RULE, totalGroups: groups.length, readyGroups: readyGroups.length, blockedGroups: blockedGroups.length, groups: groupSummaries }, null, 2)}\n`,
    "utf8",
  );

  // Write Batch 002 — the first ready group (if any)
  const batch002Path = path.join(docsRefactorDir, "move-batch-002.csv");
  const batchHeader = ["repo", "source_path", "current_owner", "correct_owner", "target_path", "reason", "import_rewrite", "risk", "approved", "tier", "group_id"];
  const batchLines = [batchHeader.join(",")];
  if (readyGroups.length > 0) {
    const firstReady = readyGroups[0];
    const groupNodes = groups[groupSummaries.indexOf(firstReady)];
    for (const node of groupNodes) {
      const original = moveRows.find((r) => String(r.source_path || "") === node.source);
      if (!original) continue;
      batchLines.push(
        [
          original.repo,
          original.source_path,
          original.repo,
          original.correct_owner,
          original.target_path,
          original.reason,
          toBoolString(original.import_rewrite),
          original.risk,
          toBoolString(original.approved),
          node.tier,
          firstReady.groupId,
        ]
          .map(csvEscape)
          .join(","),
      );
    }
  }
  await fs.writeFile(batch002Path, `${batchLines.join("\n")}\n`, "utf8");

  // Write group tier breakdown
  const groupBreakdownPath = path.join(docsRefactorDir, "move-group-breakdown.csv");
  const breakdownLines = ["group_id,size,source_repos,target_repos,risk_score,all_blocker_free,requires_rewrite,cross_repo_dependency"];
  for (const g of groupSummaries) {
    breakdownLines.push(
      [
        g.groupId,
        g.size,
        g.sourceRepos.join("|"),
        g.targetRepos.join("|"),
        g.riskScore,
        g.allBlockerFree,
        g.requiresRewrite,
        g.crossRepoDependency,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  await fs.writeFile(groupBreakdownPath, `${breakdownLines.join("\n")}\n`, "utf8");

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: "info",
      pathValue: "Docs/refactor/move-group-analysis.json",
      issue: `Phase 4 group analysis complete. ${groups.length} dependency group(s) built from ${viable.length} viable MOVE rows. ${readyGroups.length} group(s) are blocker-free.`,
      action: "KEEP",
      details: {
        phase: 4,
        rule: PHASE_4_RULE,
        totalMoveRows: moveRows.length,
        viableRows: viable.length,
        skippedMissingSource: analyses.length - viable.length,
        totalGroups: groups.length,
        readyGroups: readyGroups.length,
        blockedGroups: blockedGroups.length,
        batch002Rows: batchLines.length - 1,
        artifacts: {
          groupAnalysis: "Docs/refactor/move-group-analysis.json",
          groupBreakdown: "Docs/refactor/move-group-breakdown.csv",
          moveBatch002: "Docs/refactor/move-batch-002.csv",
        },
      },
    }),
  ];
}

function toPhase4BlockerType(code) {
  if (code === "cross-repo-dependency" || code === "cross-repo-inbound") {
    return "cross-repo";
  }
  if (code === "runtime-critical" || code === "adapter-heavy" || code === "high-dependency-depth") {
    return "runtime-coupling";
  }
  if (code === "wildcard-pattern" || code === "missing-source") {
    return "structural-contamination";
  }
  return "import-complexity";
}

function blockerDescription(code) {
  switch (code) {
    case "cross-repo-dependency":
      return "outbound import path resolves outside target ownership repo";
    case "cross-repo-inbound":
      return "inbound imports originate from a different repo than target ownership";
    case "runtime-critical":
      return "runtime-critical file requires coordinated chain-safe migration";
    case "adapter-heavy":
      return "adapter coupling requires grouped migration of related integration points";
    case "high-dependency-depth":
      return "dependency depth is high and needs staged normalization";
    case "wildcard-pattern":
      return "row uses wildcard source pattern and is not executable as a concrete move";
    case "missing-source":
      return "source path is not present on disk";
    default:
      return "import rewrite complexity requires coordinated normalization";
  }
}

function blockerResolution(type, code, group) {
  switch (type) {
    case "cross-repo":
      return "Resolve ownership boundary by relocating coupled producer and consumer modules together, then rewrite imports to target-owned paths.";
    case "runtime-coupling":
      return "Build a coordinated runtime migration set (execution chain + adapters), simulate full rewrite impact, then move as one governed group.";
    case "structural-contamination":
      if (code === "wildcard-pattern") {
        return "Expand wildcard rows into concrete file rows and re-run move-group-analyze before any move apply.";
      }
      return "Restore missing source from verified backup/target rollback evidence, then re-run group analysis.";
    case "import-complexity":
    default:
      return "Normalize import graph (alias/depth cleanup), regenerate rewrite plan, and re-evaluate blocker-free state.";
  }
}

function isWildcardValue(value) {
  return typeof value === "string" && (value.includes("*") || value.includes("?"));
}

function wildcardToRegex(pattern) {
  const normalized = String(pattern).replaceAll("\\", "/");
  let regexBody = "";

  const escapeRegexChar = (char) => {
    return /[|\\{}()[\]^$+*?.]/.test(char) ? `\\${char}` : char;
  };

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    if (ch === "*") {
      const next = normalized[i + 1];
      if (next === "*") {
        regexBody += ".*";
        i += 1;
      } else {
        regexBody += "[^/]*";
      }
      continue;
    }
    if (ch === "?") {
      regexBody += ".";
      continue;
    }
    regexBody += escapeRegexChar(ch);
  }

  return new RegExp(`^${regexBody}$`, "i");
}

function inferPrimaryCategory(group) {
  const targets = Array.isArray(group.targetRepos) ? group.targetRepos.join("|").toLowerCase() : "";
  const sources = Array.isArray(group.sources) ? group.sources.join("|").toLowerCase() : "";

  if (targets.includes("webgpu") || sources.includes("/gpu/")) return "compute";
  if (targets.includes("rtc") || sources.includes("signal") || sources.includes("transport")) return "communication";
  if (targets.includes("integrated") || sources.includes("/components/") || sources.includes("/pages/")) return "shell";
  if (targets.includes("standards") || sources.includes("governance") || sources.includes("contract")) return "governance";
  return "mixed";
}

function inferDependencyDepth(group) {
  if (group.size >= 100 || group.riskScore >= 1000) return "high";
  if (group.size >= 10 || group.riskScore >= 100) return "medium";
  return "low";
}

export async function runRehomeBlockerResolver(ctx, options = {}) {
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const analysisPath = path.join(docsRefactorDir, "move-group-analysis.json");
  const ledgerPath = path.join(docsRefactorDir, "purge-ledger.csv");
  const raw = await fs.readFile(analysisPath, "utf8").catch(() => "");

  if (!raw) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: "Phase 4 blocker resolution requires move-group-analysis.json artifact.",
        action: "KEEP",
        details: {
          requiredMode: "move-group-analyze",
        },
      }),
    ];
  }

  const payload = JSON.parse(raw);
  const groups = Array.isArray(payload.groups) ? payload.groups : [];
  const resolutionPlan = [];
  const blockerTypeCounts = {
    "cross-repo": 0,
    "import-complexity": 0,
    "runtime-coupling": 0,
    "structural-contamination": 0,
  };

  for (const group of groups) {
    const blockerCodes = [...new Set(Array.isArray(group.blockers) ? group.blockers : [])];
    const blockers = blockerCodes.map((code) => {
      const type = toPhase4BlockerType(code);
      blockerTypeCounts[type] += 1;
      return {
        type,
        code,
        description: blockerDescription(code),
        resolution: blockerResolution(type, code, group),
        status: "pending",
      };
    });

    const primaryRepo = (Array.isArray(group.sourceRepos) ? group.sourceRepos.find((r) => r && r !== "**") : "")
      || (Array.isArray(group.targetRepos) ? group.targetRepos[0] : "")
      || "unknown";

    resolutionPlan.push({
      groupId: group.groupId,
      primaryRepo,
      category: inferPrimaryCategory(group),
      dependencyDepth: inferDependencyDepth(group),
      blockers,
      resolutionState: blockers.length === 0 ? "ready" : "blocked",
    });
  }

  const planPath = path.join(docsRefactorDir, "move-group-resolution-plan.json");
  const planPayload = {
    phase: 4,
    rule: "Groups are not moved. Groups are prepared, cleared, and then moved.",
    generatedAt: new Date().toISOString(),
    totalGroups: resolutionPlan.length,
    blockedGroups: resolutionPlan.filter((g) => g.resolutionState === "blocked").length,
    readyGroups: resolutionPlan.filter((g) => g.resolutionState === "ready").length,
    blockerTypeCounts,
    groups: resolutionPlan,
  };
  await fs.writeFile(planPath, `${JSON.stringify(planPayload, null, 2)}\n`, "utf8");

  // Begin resolving one group at a time: first structural-contamination wildcard group
  const targetGroup = resolutionPlan.find((g) => g.blockers.some((b) => b.code === "wildcard-pattern"));
  let resolutionAction = null;
  if (targetGroup) {
    const groupSourceSet = new Set((groups.find((g) => g.groupId === targetGroup.groupId)?.sources || []).map((s) => String(s)));
    const moveRows = (await readCsvRows(ledgerPath)).filter((r) => String(r.action || "").toUpperCase() === "MOVE");
    const concreteRows = [];

    for (const sourcePattern of groupSourceSet) {
      if (!isWildcardValue(sourcePattern)) continue;
      const matcher = wildcardToRegex(sourcePattern);
      for (const row of moveRows) {
        const sourcePath = String(row.source_path || "").replaceAll("\\", "/");
        const targetPath = String(row.target_path || "").replaceAll("\\", "/");
        if (isWildcardValue(sourcePath)) continue;
        // Some wildcard groups are expressed by intended destination zone
        // (for example **/transport/**), so match both source and target paths.
        const sourceNorm = sourcePath.endsWith("/") ? sourcePath : `${sourcePath}/`;
        const targetNorm = targetPath.endsWith("/") ? targetPath : `${targetPath}/`;
        if (
          matcher.test(sourcePath)
          || matcher.test(sourceNorm)
          || matcher.test(targetPath)
          || matcher.test(targetNorm)
        ) {
          concreteRows.push({
            group_id: targetGroup.groupId,
            source_pattern: sourcePattern,
            repo: String(row.repo || ""),
            source_path: sourcePath,
            target_path: targetPath,
            reason: String(row.reason || ""),
            risk: String(row.risk || ""),
          });
        }
      }
    }

    const uniq = [];
    const seen = new Set();
    for (const row of concreteRows) {
      const key = `${row.source_pattern}|${row.source_path}|${row.target_path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(row);
    }

    const outDir = path.join(docsRefactorDir, "group-resolution");
    await fs.mkdir(outDir, { recursive: true });
    const expansionPath = path.join(outDir, `${targetGroup.groupId}-wildcard-expansion.csv`);
    const header = ["group_id", "source_pattern", "repo", "source_path", "target_path", "reason", "risk"];
    const lines = [header.join(",")];
    for (const row of uniq) {
      lines.push(header.map((k) => csvEscape(row[k])).join(","));
    }
    await fs.writeFile(expansionPath, `${lines.join("\n")}\n`, "utf8");

    resolutionAction = {
      groupId: targetGroup.groupId,
      step: "expand-wildcard-patterns",
      output: path.relative(ctx.standardsRoot, expansionPath).replaceAll("\\", "/"),
      expandedRows: uniq.length,
      status: "completed",
      note: "Concrete candidate set prepared. No file moves were executed.",
    };
  }

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: "info",
      pathValue: "Docs/refactor/move-group-resolution-plan.json",
      issue: `Phase 4 blocker resolution plan generated for ${resolutionPlan.length} group(s).`,
      action: "KEEP",
      details: {
        totalGroups: resolutionPlan.length,
        blockedGroups: planPayload.blockedGroups,
        readyGroups: planPayload.readyGroups,
        blockerTypeCounts,
        resolutionAction,
      },
    }),
  ];
}

// ─── Phase 5: Group-Based Structural Apply ────────────────────────────────────
// Gate: coupling-completeness instead of Tier1-only.
// A group is movable when all inbound importers of every member are either:
//   (a) also in the group (they move together), OR
//   (b) not actually importing from the OLD path (no real coupling).
// Zero-coupling files (0 inbound, 0 outbound) are always movable.

export async function runRehomeGroupApply(ctx, options = {}) {
  const apply = Boolean(options.apply);
  const targetGroupId = String(options.groupId || "");
  const docsRefactorDir = path.join(ctx.standardsRoot, "Docs", "refactor");
  const analysisPath = path.join(docsRefactorDir, "move-group-analysis.json");
  const ledgerPath = path.join(docsRefactorDir, "purge-ledger.csv");
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");

  // Require group analysis artifact
  const raw = await fs.readFile(analysisPath, "utf8").catch(() => "");
  if (!raw) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: "move-group-apply requires move-group-analysis.json. Run move-group-analyze first.",
        action: "KEEP",
        details: { requiredMode: "move-group-analyze" },
      }),
    ];
  }

  const payload = JSON.parse(raw);
  const allGroups = Array.isArray(payload.groups) ? payload.groups : [];

  // Select target group: explicit --group=ID, else first blocker-free, else first group
  let targetGroup = targetGroupId
    ? allGroups.find((g) => g.groupId === targetGroupId)
    : (allGroups.find((g) => g.allBlockerFree) || allGroups[0]);

  // Subgroup support: allow IDs like G001-A backed by Docs/refactor/group-resolution/G001-A.csv
  const subgroupPath = targetGroupId
    ? path.join(docsRefactorDir, "group-resolution", `${targetGroupId}.csv`)
    : "";
  const subgroupExists = subgroupPath
    ? await fs.stat(subgroupPath).then(() => true).catch(() => false)
    : false;
  const subgroupRows = subgroupPath ? await readCsvRows(subgroupPath).catch(() => []) : [];

  if (!targetGroup && subgroupExists) {
    targetGroup = {
      groupId: targetGroupId,
      size: subgroupRows.length,
      sources: subgroupRows.map((r) => String(r.source_path || "")).filter(Boolean),
      targetRepos: [...new Set(subgroupRows.map((r) => String(r.target_path || "").split(/[\\/]/)[0]).filter(Boolean))],
      sourceRepos: [...new Set(subgroupRows.map((r) => String(r.repo || "")).filter(Boolean))],
      allBlockerFree: true,
      blockers: [],
      riskScore: 0,
      requiresRewrite: subgroupRows.some((r) => toBoolString(r.import_rewrite) === "true"),
      crossRepoDependency: false,
      crossRepoInboundDependency: false,
    };
  }

  if (!targetGroup) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: `Group "${targetGroupId || "(auto)"}" not found in group analysis.`,
        action: "KEEP",
        details: {
          targetGroupId,
          subgroupPath: subgroupPath ? path.relative(ctx.standardsRoot, subgroupPath).replaceAll("\\", "/") : "",
          availableGroups: allGroups.map((g) => g.groupId),
        },
      }),
    ];
  }

  // Map group sources to concrete ledger rows
  const allRows = await readCsvRows(ledgerPath);
  const moveRows = allRows.filter((r) => String(r.action || "").toUpperCase() === "MOVE");
  const groupRows = [];
  const wildcardSources = [];

  if (subgroupRows.length > 0) {
    for (const sg of subgroupRows) {
      const sourcePath = String(sg.source_path || "").replaceAll("\\", "/");
      const targetPath = String(sg.target_path || "").replaceAll("\\", "/");
      if (!sourcePath || !targetPath) continue;
      const row = moveRows.find(
        (r) => String(r.source_path || "") === sourcePath && String(r.target_path || "") === targetPath,
      );
      if (row) groupRows.push(row);
    }
  }

  if (groupRows.length === 0) {
    for (const src of targetGroup.sources) {
      if (isWildcardValue(src)) {
        wildcardSources.push(src);
        continue;
      }
      const row = moveRows.find((r) => String(r.source_path || "") === src);
      if (row) groupRows.push(row);
    }
  }

  if (wildcardSources.length > 0) {
    const expansionPath = path.join(docsRefactorDir, "group-resolution", `${targetGroup.groupId}-wildcard-expansion.csv`);
    const expansionRows = await readCsvRows(expansionPath).catch(() => []);
    const expanded = [];
    for (const exp of expansionRows) {
      const sourcePath = String(exp.source_path || "").replaceAll("\\", "/");
      const targetPath = String(exp.target_path || "").replaceAll("\\", "/");
      if (!sourcePath || !targetPath) continue;
      const row = moveRows.find(
        (r) => String(r.source_path || "") === sourcePath && String(r.target_path || "") === targetPath,
      );
      if (row) expanded.push(row);
    }

    if (expanded.length === 0) {
      return [
        makeReceipt({
          agent: "rehome-orchestrator",
          severity: "blocking",
          pathValue: "Docs/refactor/move-group-analysis.json",
          issue: `Group ${targetGroup.groupId} contains ${wildcardSources.length} wildcard source(s). Expansion exists but yielded no executable rows.`,
          action: "KEEP",
          details: { targetGroupId: targetGroup.groupId, wildcardSources, expansionPath: path.relative(ctx.standardsRoot, expansionPath).replaceAll("\\", "/") },
        }),
      ];
    }

    for (const row of expanded) {
      if (!groupRows.includes(row)) groupRows.push(row);
    }
  }

  if (groupRows.length === 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: `Group ${targetGroup.groupId} has no concrete ledger rows. All sources may be missing or wildcard.`,
        action: "KEEP",
        details: { targetGroupId: targetGroup.groupId, sources: targetGroup.sources },
      }),
    ];
  }

  // Build import index and analyze each group member
  const importIndex = await buildImportIndex(workspaceRoot);
  const analyses = [];
  for (const row of groupRows) {
    analyses.push(await analyzeMoveRow(row, ctx.standardsRoot, importIndex));
  }

  // Coupling-completeness gate
  const groupSourceSet = new Set(
    groupRows.map((r) => normalizeAbs(path.resolve(workspaceRoot, r.source_path))),
  );
  const couplingViolations = [];

  for (const analysis of analyses) {
    const sourceAbs = path.resolve(workspaceRoot, analysis.source);
    const fileStem = path.basename(analysis.source, path.extname(analysis.source)).toLowerCase();

    const externalImporters = importIndex.filter((entry) => {
      if (normalizeAbs(entry.file) === normalizeAbs(sourceAbs)) return false;
      if (groupSourceSet.has(normalizeAbs(entry.file))) return false;
      return entry.specifiers.some((s) => {
        const candidates = candidateResolvedPaths(entry.file, s);
        return candidates.includes(normalizeAbs(sourceAbs));
      });
    });

    if (externalImporters.length > 0) {
      couplingViolations.push({
        source: analysis.source,
        externalImporterCount: externalImporters.length,
        externalImporters: externalImporters
          .slice(0, 10)
          .map((e) => path.relative(workspaceRoot, e.file).replaceAll("\\", "/")),
      });
    }
  }

  if (couplingViolations.length > 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: `Group ${targetGroup.groupId} coupling gate failed: ${couplingViolations.length} member(s) have external inbound importers that would break after the move.`,
        action: "KEEP",
        details: {
          apply,
          groupId: targetGroup.groupId,
          couplingViolations,
          recommendation: "Expand the group to include all external importers, or add import-rewrite entries for them before applying.",
        },
      }),
    ];
  }

  // Collision detection
  const seenTargets = new Set();
  const collisions = [];
  const sourceTargets = [];

  for (const row of groupRows) {
    const sourceAbs = path.resolve(workspaceRoot, row.source_path);
    const targetAbs = path.resolve(workspaceRoot, row.target_path, path.basename(row.source_path));
    const targetKey = normalizeAbs(targetAbs);

    if (seenTargets.has(targetKey)) {
      collisions.push({ source: row.source_path, target: path.relative(workspaceRoot, targetAbs).replaceAll("\\", "/") });
      continue;
    }
    seenTargets.add(targetKey);

    const targetExists = await fs.stat(targetAbs).then(() => true).catch(() => false);
    if (targetExists) {
      collisions.push({ source: row.source_path, target: path.relative(workspaceRoot, targetAbs).replaceAll("\\", "/") });
      continue;
    }
    sourceTargets.push({ row, sourceAbs, targetAbs });
  }

  if (collisions.length > 0) {
    return [
      makeReceipt({
        agent: "rehome-orchestrator",
        severity: "blocking",
        pathValue: "Docs/refactor/move-group-analysis.json",
        issue: `Group ${targetGroup.groupId} blocked: ${collisions.length} target collision(s) detected.`,
        action: "KEEP",
        details: { apply, groupId: targetGroup.groupId, collisions },
      }),
    ];
  }

  // Build rewrite plan (handles import path fixups)
  const rewritePlan = buildRewritePlanEntries(groupRows, analyses, importIndex, workspaceRoot);
  const rewritePlanPath = path.join(docsRefactorDir, "move-rewrite-plan.json");
  await fs.writeFile(rewritePlanPath, `${JSON.stringify(rewritePlan, null, 2)}\n`, "utf8");

  const timestamp = Date.now();
  const backupRoot = path.join(ctx.receiptsDir, "move-apply-backups", String(timestamp));
  const missing = [];
  const moved = [];
  const rewrittenFiles = [];

  // Stage backups
  for (const item of sourceTargets) {
    const exists = await fs.stat(item.sourceAbs).then(() => true).catch(() => false);
    if (!exists) {
      missing.push(item.row.source_path);
      continue;
    }
    if (apply) await ensureBackup(backupRoot, workspaceRoot, item.sourceAbs);
  }
  for (const planEntry of rewritePlan) {
    const planFileAbs = path.resolve(workspaceRoot, planEntry.file);
    if (apply) await ensureBackup(backupRoot, workspaceRoot, planFileAbs);
  }

  // Execute moves + rewrites
  if (apply) {
    for (const item of sourceTargets) {
      const exists = await fs.stat(item.sourceAbs).then(() => true).catch(() => false);
      if (!exists) continue;
      await fs.mkdir(path.dirname(item.targetAbs), { recursive: true });
      await fs.rename(item.sourceAbs, item.targetAbs);
      moved.push({
        source: item.row.source_path,
        target: path.relative(workspaceRoot, item.targetAbs).replaceAll("\\", "/"),
      });
    }

    for (const planEntry of rewritePlan) {
      const fileAbs = path.resolve(workspaceRoot, planEntry.file);
      const exists = await fs.stat(fileAbs).then(() => true).catch(() => false);
      if (!exists) continue;
      let text = await fs.readFile(fileAbs, "utf8").catch(() => "");
      const before = text;
      for (const rewrite of planEntry.importsToRewrite) {
        text = rewriteSpecifierInText(text, rewrite.from, rewrite.to);
      }
      if (text !== before) {
        await fs.writeFile(fileAbs, text, "utf8");
        rewrittenFiles.push({ file: planEntry.file, rewrites: planEntry.importsToRewrite.length });
      }
    }
  }

  // Rollback manifest
  const rollbackPlanPath = path.join(docsRefactorDir, "move-rollback-plan.json");
  const rollbackPlan = {
    generatedAt: new Date(timestamp).toISOString(),
    groupId: targetGroup.groupId,
    backupRoot: path.relative(workspaceRoot, backupRoot).replaceAll("\\", "/"),
    moves: sourceTargets.map((item) => ({
      source: item.row.source_path,
      target: path.relative(workspaceRoot, item.targetAbs).replaceAll("\\", "/"),
    })),
    rewrittenFiles: rewritePlan.map((entry) => entry.file),
  };
  await fs.writeFile(rollbackPlanPath, `${JSON.stringify(rollbackPlan, null, 2)}\n`, "utf8");

  return [
    makeReceipt({
      agent: "rehome-orchestrator",
      severity: missing.length > 0 ? "warn" : "info",
      pathValue: "Docs/refactor/move-group-analysis.json",
      issue: `${apply ? "Applied" : "Dry-run"} group move for ${targetGroup.groupId}: ${apply ? moved.length : sourceTargets.length - missing.length} file(s).`,
      action: apply ? "MOVE" : "KEEP",
      details: {
        apply,
        groupId: targetGroup.groupId,
        groupSize: targetGroup.size,
        matchedRows: groupRows.length,
        moved,
        missing,
        rewrittenFiles,
        couplingViolations: 0,
        rewritePlan: "Docs/refactor/move-rewrite-plan.json",
        rollbackPlan: "Docs/refactor/move-rollback-plan.json",
        backupRoot: path.relative(workspaceRoot, backupRoot).replaceAll("\\", "/"),
      },
    }),
  ];
}
