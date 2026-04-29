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
WHERE = src/agents/service/data-lineage-tracker/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { makeReceipt } from "../common/receipts.js";

const REPO_PATHS = [
  "agent-lee-agentic-os",
  "LeeWay-Agents-the-World-Within",
  "LeeWay-Edge-Integrated",
  "LeeWay-Edge-RTC-main",
  "LeewayEdgeWebGPU",
  "LeeWay-Standards",
];

const SCOPE_ALIASES = {
  all: REPO_PATHS,
  standards: ["LeeWay-Standards"],
  integrated: ["LeeWay-Edge-Integrated"],
  rtc: ["LeeWay-Edge-RTC-main"],
  gpu: ["LeewayEdgeWebGPU"],
  agent: ["agent-lee-agentic-os"],
  worldwithin: ["LeeWay-Agents-the-World-Within"],
};

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "receipts",
  "move-apply-backups",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  "__pycache__",
  ".next",
  ".turbo",
]);

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const KNOWN_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".yaml",
  ".yml",
  ".toml",
  ".html",
  ".css",
  ".scss",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".mp4",
  ".webm",
  ".zip",
  ".exe",
  ".whl",
  ".gguf",
  ".safetensors",
  ".onnx",
  ".bin",
  ".py",
  ".sh",
  ".ps1",
]);

const EXTERNALIZE_EXTS = new Set([".gguf", ".safetensors", ".mp4", ".zip", ".exe", ".whl"]);
const LARGE_FILE_BYTES = 10 * 1024 * 1024;

const ENTRYPOINT_NAMES = new Set([
  "index.ts",
  "index.tsx",
  "index.js",
  "index.jsx",
  "main.ts",
  "main.tsx",
  "main.js",
  "main.jsx",
  "app.ts",
  "app.tsx",
  "app.js",
  "app.jsx",
  "vite.config.ts",
  "vite.config.js",
  "playwright.config.ts",
  "playwright.config.js",
  "capacitor.config.ts",
]);

function toPosix(value) {
  return value.replaceAll("\\", "/");
}

function csvEscape(value) {
  const raw = String(value ?? "").replaceAll("\r", " ").replaceAll("\n", " ").replaceAll(",", ";");
  if (!raw.includes('"')) return raw;
  return `"${raw.replaceAll('"', '""')}"`;
}

function parseScope(scopeArg) {
  const input = (scopeArg || "standards").trim().toLowerCase();
  if (SCOPE_ALIASES[input]) {
    return [...SCOPE_ALIASES[input]];
  }

  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  const expanded = new Set();
  for (const part of parts) {
    if (SCOPE_ALIASES[part]) {
      for (const repo of SCOPE_ALIASES[part]) expanded.add(repo);
      continue;
    }

    const canonical = REPO_PATHS.find((repoPath) => repoPath.toLowerCase() === part || repoPath.toLowerCase().includes(part));
    if (canonical) {
      expanded.add(canonical);
    }
  }

  if (expanded.size === 0) {
    return ["LeeWay-Standards"];
  }

  return [...expanded];
}

async function exists(absPath) {
  return fs
    .stat(absPath)
    .then(() => true)
    .catch(() => false);
}

async function walkRepo(repoName, repoRootAbs, outFiles, nestedRepoDirs, currentAbs = repoRootAbs) {
  let entries = [];
  try {
    entries = await fs.readdir(currentAbs, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullAbs = path.join(currentAbs, entry.name);
    const relFromRepo = toPosix(path.relative(repoRootAbs, fullAbs));
    const relLower = relFromRepo.toLowerCase();

    // Ignore service artifacts so SSA scans reflect active system structure only.
    if (
      relLower.startsWith("receipts/") ||
      relLower.includes("/receipts/") ||
      relLower.includes("/move-apply-backups/")
    ) {
      continue;
    }

    if (entry.isDirectory()) {
      if (REPO_PATHS.includes(entry.name)) {
        nestedRepoDirs.push({ repo: repoName, sourcePath: `${repoName}/${relFromRepo}`, nestedName: entry.name });
      }

      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }

      await walkRepo(repoName, repoRootAbs, outFiles, nestedRepoDirs, fullAbs);
      continue;
    }

    if (!entry.isFile()) continue;

    const stat = await fs.stat(fullAbs).catch(() => null);
    if (!stat) continue;

    outFiles.push({
      repo: repoName,
      absPath: fullAbs,
      relPath: relFromRepo,
      sourcePath: `${repoName}/${relFromRepo}`,
      ext: path.extname(entry.name).toLowerCase(),
      fileName: entry.name,
      size: stat.size,
    });
  }
}

function makeDetection(fileMeta, overrides) {
  return {
    path: fileMeta.sourcePath,
    detectedRole: overrides.detectedRole,
    expectedOwner: overrides.expectedOwner,
    currentOwner: fileMeta.repo,
    issue: overrides.issue,
    confidence: overrides.confidence ?? 0.9,
    action: overrides.action,
    targetPath: overrides.targetPath || "",
    risk: overrides.risk || "medium",
    reason: overrides.reason,
    importRewrite: Boolean(overrides.importRewrite),
    approved: false,
  };
}

function classifyFile(fileMeta) {
  const detections = [];
  const sourceLower = `/${fileMeta.sourcePath.toLowerCase()}`;
  const nameLower = fileMeta.fileName.toLowerCase();
  const isProjectionRepo = fileMeta.repo === "agent-lee-agentic-os" || fileMeta.repo === "LeeWay-Agents-the-World-Within";

  if (EXTERNALIZE_EXTS.has(fileMeta.ext) || fileMeta.size >= LARGE_FILE_BYTES) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "binary",
        expectedOwner: "External",
        issue: "EXTERNALIZE_ARTIFACT",
        action: "EXTERNALIZE",
        risk: "high",
        reason: fileMeta.size >= LARGE_FILE_BYTES ? "large asset artifact" : "model or binary artifact",
        confidence: 0.98,
      }),
    );
  }

  if (isProjectionRepo && sourceLower.includes("/runtime/")) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "runtime",
        expectedOwner: "Integrated",
        issue: "MISPLACED_RUNTIME",
        action: "MOVE",
        targetPath: "LeeWay-Edge-Integrated/runtime",
        risk: "high",
        reason: "projection owning runtime",
        importRewrite: true,
        confidence: 0.96,
      }),
    );
  }

  if (fileMeta.repo !== "LeeWay-Edge-Integrated" && /\/(pages|components|ui)\//.test(sourceLower)) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "ui",
        expectedOwner: "Integrated",
        issue: "MISPLACED_UI_SHELL",
        action: "MOVE",
        targetPath: "LeeWay-Edge-Integrated/app",
        risk: "high",
        reason: "ui shell outside integrated",
        importRewrite: true,
        confidence: 0.93,
      }),
    );
  }

  if (
    fileMeta.repo !== "LeeWay-Edge-RTC-main" &&
    (sourceLower.includes("/transport/") ||
      sourceLower.includes("/rtc/") ||
      sourceLower.includes("webrtc") ||
      sourceLower.includes("signaling") ||
      sourceLower.includes("room-system") ||
      sourceLower.includes("tts-bridge"))
  ) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "rtc",
        expectedOwner: "RTC",
        issue: "MISPLACED_RTC",
        action: "MOVE",
        targetPath: "LeeWay-Edge-RTC-main/src/transport",
        risk: "high",
        reason: "rtc logic outside rtc repo",
        importRewrite: true,
        confidence: 0.94,
      }),
    );
  }

  if (
    fileMeta.repo !== "LeewayEdgeWebGPU" &&
    (sourceLower.includes("/gpu/") || sourceLower.includes("webgpu") || sourceLower.includes("shader") || sourceLower.includes("compute") || sourceLower.includes("/cortices/"))
  ) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "compute",
        expectedOwner: "GPU",
        issue: "MISPLACED_GPU",
        action: "MOVE",
        targetPath: "LeewayEdgeWebGPU/gpu",
        risk: "high",
        reason: "gpu logic outside webgpu repo",
        importRewrite: true,
        confidence: 0.94,
      }),
    );
  }

  if (
    fileMeta.repo !== "LeeWay-Standards" &&
    (nameLower.startsWith("governancecontract.") ||
      nameLower.startsWith("intentsanitizer.") ||
      sourceLower.includes("/governancecontract") ||
      sourceLower.includes("/intentsanitizer"))
  ) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "governance",
        expectedOwner: "Standards",
        issue: "MISPLACED_GOVERNANCE",
        action: "MOVE",
        targetPath: "LeeWay-Standards/packages/standards/policy",
        risk: "high",
        reason: "law duplication",
        importRewrite: true,
        confidence: 0.99,
      }),
    );
  }

  if (
    fileMeta.repo !== "LeeWay-Standards" &&
    (sourceLower.includes("/policy/") || sourceLower.includes("/validators/") || sourceLower.includes("/validator/"))
  ) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "governance",
        expectedOwner: "Standards",
        issue: "MISPLACED_GOVERNANCE",
        action: "MOVE",
        targetPath: "LeeWay-Standards/packages/standards/validators",
        risk: "high",
        reason: "law duplication",
        importRewrite: true,
        confidence: 0.9,
      }),
    );
  }

  if (fileMeta.size === 0 || /(placeholder|todo|dummy|temp|stub)\.(txt|md|js|ts|json)$/i.test(fileMeta.fileName)) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "placeholder",
        expectedOwner: "External",
        issue: "DEAD_PLACEHOLDER",
        action: "QUARANTINE",
        risk: "low",
        reason: "dead placeholder file",
        confidence: 0.92,
      }),
    );
  }

  if (!KNOWN_EXTS.has(fileMeta.ext)) {
    detections.push(
      makeDetection(fileMeta, {
        detectedRole: "unknown",
        expectedOwner: "External",
        issue: "UNKNOWN_OWNERSHIP",
        action: "QUARANTINE",
        risk: "medium",
        reason: "unknown ownership fallback",
        confidence: 0.7,
      }),
    );
  }

  return detections;
}

async function hashFiles(files) {
  const byHash = new Map();
  for (const fileMeta of files) {
    if (fileMeta.size > LARGE_FILE_BYTES * 3) {
      continue;
    }

    const content = await fs.readFile(fileMeta.absPath).catch(() => null);
    if (!content) continue;

    const hash = crypto.createHash("sha256").update(content).digest("hex");
    const list = byHash.get(hash) || [];
    list.push(fileMeta);
    byHash.set(hash, list);
  }
  return byHash;
}

function repoRank(repoName) {
  return REPO_PATHS.indexOf(repoName);
}

function parseImports(text) {
  const imports = [];
  const patterns = [
    /import\s+[^"'`]+?from\s+["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g,
    /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(text)) !== null) {
      if (match[1]) imports.push(match[1]);
    }
  }
  return imports;
}

function resolveRelativeImport(fromRelPath, token, codeFileSet) {
  const baseDir = path.posix.dirname(toPosix(fromRelPath));
  const raw = path.posix.normalize(path.posix.join(baseDir, token));
  const ext = path.posix.extname(raw);

  if (codeFileSet.has(raw)) return raw;

  if (!ext) {
    for (const candidateExt of CODE_EXTS) {
      const withExt = `${raw}${candidateExt}`;
      if (codeFileSet.has(withExt)) return withExt;
    }
    for (const candidateExt of CODE_EXTS) {
      const asIndex = `${raw}/index${candidateExt}`;
      if (codeFileSet.has(asIndex)) return asIndex;
    }
  }

  return null;
}

function isEntryPoint(relPath) {
  const rel = toPosix(relPath);
  const base = path.posix.basename(rel).toLowerCase();
  if (ENTRYPOINT_NAMES.has(base)) return true;
  if (rel.includes("/tests/") || rel.includes("/test/") || rel.endsWith(".test.ts") || rel.endsWith(".test.js") || rel.endsWith(".spec.ts") || rel.endsWith(".spec.js")) {
    return true;
  }
  if (rel.startsWith("scripts/")) return true;
  return false;
}

function detectionToLedgerRow(d) {
  return {
    repo: d.currentOwner,
    source_path: d.path,
    current_role: d.detectedRole,
    correct_owner: d.expectedOwner,
    action: d.action,
    target_path: d.targetPath || "",
    risk: d.risk,
    reason: d.reason,
    import_rewrite: String(Boolean(d.importRewrite)),
    approved: "false",
  };
}

function getSeedRows() {
  return [
    {
      repo: "*",
      source_path: "**/node_modules/**",
      current_role: "env",
      correct_owner: "External",
      action: "EXTERNALIZE",
      target_path: "",
      risk: "low",
      reason: "dependency cache",
      import_rewrite: "false",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/.venv/**",
      current_role: "env",
      correct_owner: "External",
      action: "EXTERNALIZE",
      target_path: "",
      risk: "low",
      reason: "virtual environment",
      import_rewrite: "false",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/dist/**",
      current_role: "build",
      correct_owner: "External",
      action: "EXTERNALIZE",
      target_path: "",
      risk: "low",
      reason: "build output",
      import_rewrite: "false",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/*.gguf",
      current_role: "binary",
      correct_owner: "External",
      action: "EXTERNALIZE",
      target_path: "",
      risk: "high",
      reason: "model artifact",
      import_rewrite: "false",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/*.safetensors",
      current_role: "binary",
      correct_owner: "External",
      action: "EXTERNALIZE",
      target_path: "",
      risk: "high",
      reason: "model artifact",
      import_rewrite: "false",
      approved: "false",
    },
    {
      repo: "agent-lee-agentic-os",
      source_path: "**/runtime/**",
      current_role: "runtime",
      correct_owner: "Integrated",
      action: "MOVE",
      target_path: "LeeWay-Edge-Integrated/runtime",
      risk: "high",
      reason: "projection owning runtime",
      import_rewrite: "true",
      approved: "false",
    },
    {
      repo: "LeeWay-Agents-the-World-Within",
      source_path: "**/runtime/**",
      current_role: "runtime",
      correct_owner: "Integrated",
      action: "MOVE",
      target_path: "LeeWay-Edge-Integrated/runtime",
      risk: "high",
      reason: "projection owning runtime",
      import_rewrite: "true",
      approved: "false",
    },
    {
      repo: "LeeWay-Edge-Integrated",
      source_path: "**/transport/**",
      current_role: "rtc",
      correct_owner: "RTC",
      action: "MOVE",
      target_path: "LeeWay-Edge-RTC-main/src/transport",
      risk: "high",
      reason: "transport misplaced",
      import_rewrite: "true",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/GovernanceContract.*",
      current_role: "governance",
      correct_owner: "Standards",
      action: "MOVE",
      target_path: "LeeWay-Standards/packages/standards/policy",
      risk: "high",
      reason: "law duplication",
      import_rewrite: "true",
      approved: "false",
    },
    {
      repo: "*",
      source_path: "**/IntentSanitizer.*",
      current_role: "governance",
      correct_owner: "Standards",
      action: "MOVE",
      target_path: "LeeWay-Standards/packages/standards/validators",
      risk: "high",
      reason: "law duplication",
      import_rewrite: "true",
      approved: "false",
    },
  ];
}

function dedupeRows(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = [
      row.repo,
      row.source_path,
      row.current_role,
      row.correct_owner,
      row.action,
      row.target_path,
      row.risk,
      row.reason,
      row.import_rewrite,
      row.approved,
    ].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

function rowsToCsv(rows) {
  const header = "repo,source_path,current_role,correct_owner,action,target_path,risk,reason,import_rewrite,approved";
  const body = rows.map((row) => {
    return [
      row.repo,
      row.source_path,
      row.current_role,
      row.correct_owner,
      row.action,
      row.target_path,
      row.risk,
      row.reason,
      row.import_rewrite,
      row.approved,
    ]
      .map(csvEscape)
      .join(",");
  });
  return `${header}\n${body.join("\n")}\n`;
}

export async function runDataLineageTracker(ctx) {
  const workspaceRoot = path.resolve(ctx.standardsRoot, "..");
  const scopeRepos = parseScope(ctx.scope);
  const activeRepos = [];

  for (const repoName of scopeRepos) {
    const repoAbs = path.join(workspaceRoot, repoName);
    if (await exists(repoAbs)) {
      activeRepos.push({ repoName, repoAbs });
    }
  }

  const files = [];
  const nestedRepoDirs = [];
  for (const repo of activeRepos) {
    await walkRepo(repo.repoName, repo.repoAbs, files, nestedRepoDirs);
  }

  const detections = [];
  for (const nested of nestedRepoDirs) {
    detections.push({
      path: nested.sourcePath,
      detectedRole: "nested-repo",
      expectedOwner: "External",
      currentOwner: nested.repo,
      issue: "NESTED_REPO_COPY",
      confidence: 0.99,
      action: "QUARANTINE",
      targetPath: "",
      risk: "high",
      reason: "nested repo copy detected",
      importRewrite: false,
      approved: false,
    });
  }

  for (const fileMeta of files) {
    detections.push(...classifyFile(fileMeta));
  }

  const hashGroups = await hashFiles(files);
  for (const group of hashGroups.values()) {
    const repoSet = new Set(group.map((g) => g.repo));
    if (group.length < 2 || repoSet.size < 2) continue;

    const ordered = [...group].sort((a, b) => {
      const rankDelta = repoRank(a.repo) - repoRank(b.repo);
      if (rankDelta !== 0) return rankDelta;
      return a.sourcePath.localeCompare(b.sourcePath);
    });

    const canonical = ordered[0];
    for (let i = 1; i < ordered.length; i += 1) {
      const entry = ordered[i];
      detections.push({
        path: entry.sourcePath,
        detectedRole: "duplicate",
        expectedOwner: canonical.repo,
        currentOwner: entry.repo,
        issue: "DUPLICATE_CROSS_REPO",
        confidence: 0.99,
        action: "QUARANTINE",
        targetPath: "",
        risk: "low",
        reason: `duplicate across repos canonical ${canonical.repo}`,
        importRewrite: false,
        approved: false,
      });
    }
  }

  const filesByRepo = new Map();
  for (const fileMeta of files) {
    if (!CODE_EXTS.has(fileMeta.ext)) continue;
    if (!filesByRepo.has(fileMeta.repo)) filesByRepo.set(fileMeta.repo, []);
    filesByRepo.get(fileMeta.repo).push(fileMeta);
  }

  for (const [repoName, repoFiles] of filesByRepo.entries()) {
    const codeSet = new Set(repoFiles.map((f) => toPosix(f.relPath)));
    const inbound = new Map();
    for (const rel of codeSet) inbound.set(rel, 0);

    for (const fileMeta of repoFiles) {
      const content = await fs.readFile(fileMeta.absPath, "utf8").catch(() => "");
      if (!content) continue;

      const tokens = parseImports(content);
      for (const token of tokens) {
        if (!token.startsWith(".")) continue;

        const resolved = resolveRelativeImport(fileMeta.relPath, token, codeSet);
        if (!resolved) {
          detections.push({
            path: fileMeta.sourcePath,
            detectedRole: "import",
            expectedOwner: "External",
            currentOwner: repoName,
            issue: "BROKEN_IMPORT_PATH",
            confidence: 0.9,
            action: "QUARANTINE",
            targetPath: "",
            risk: "medium",
            reason: `broken import path ${token}`,
            importRewrite: false,
            approved: false,
          });
          continue;
        }

        inbound.set(resolved, (inbound.get(resolved) || 0) + 1);
      }
    }

    for (const fileMeta of repoFiles) {
      const rel = toPosix(fileMeta.relPath);
      if (isEntryPoint(rel)) continue;
      if ((inbound.get(rel) || 0) > 0) continue;

      detections.push({
        path: fileMeta.sourcePath,
        detectedRole: "orphan",
        expectedOwner: "External",
        currentOwner: repoName,
        issue: "ORPHAN_FILE",
        confidence: 0.85,
        action: "QUARANTINE",
        targetPath: "",
        risk: "low",
        reason: "orphaned file",
        importRewrite: false,
        approved: false,
      });
    }
  }

  const rawPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-scan-raw.json");
  await fs.writeFile(
    rawPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        scope: scopeRepos,
        fileCount: files.length,
        detectionCount: detections.length,
        detections,
      },
      null,
      2,
    ),
    "utf8",
  );

  const seedRows = getSeedRows();
  const detectionRows = detections.map(detectionToLedgerRow);
  const ledgerRows = dedupeRows([...seedRows, ...detectionRows]);

  const ledgerPath = path.join(ctx.standardsRoot, "Docs", "refactor", "purge-ledger.csv");
  await fs.writeFile(ledgerPath, rowsToCsv(ledgerRows), "utf8");

  const byAction = ledgerRows.reduce((acc, row) => {
    const key = row.action;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byRepo = ledgerRows.reduce((acc, row) => {
    const key = row.repo;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return [
    makeReceipt({
      agent: "data-lineage-tracker",
      severity: "info",
      pathValue: "Docs/refactor/purge-ledger.csv",
      issue: `Generated purge ledger with ${ledgerRows.length} rows from ${files.length} scanned files across ${scopeRepos.length} repos.`,
      action: "KEEP",
      details: {
        scope: scopeRepos,
        filesScanned: files.length,
        detections: detections.length,
        rows: ledgerRows.length,
        byAction,
        byRepo,
        rawPath: toPosix(path.relative(ctx.standardsRoot, rawPath)),
      },
    }),
  ];
}
