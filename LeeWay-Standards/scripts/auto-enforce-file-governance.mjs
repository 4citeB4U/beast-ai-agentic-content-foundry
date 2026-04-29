/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.AUTO_ENFORCE_FILE_GOVERNANCE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = auto-enforce-file-governance — governed module
WHY = Enforce LeeWay file-level header, tag, region, and discovery pipeline requirements before code enters runtime
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/auto-enforce-file-governance.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, '..');

const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const SKIP_SEGMENTS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '__quarantine__']);
const DISCOVERY_PIPELINE = 'Voice → Intent → Location → Vertical → Ranking → Render';

function parseArgs(argv) {
  const options = {
    apply: false,
    strict: false,
    root: standardsRoot,
    include: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }
    if (arg === '--root' && argv[i + 1]) {
      options.root = path.resolve(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--include' && argv[i + 1]) {
      options.include.push(path.resolve(argv[i + 1]));
      i += 1;
    }
  }

  return options;
}

function inferRegion(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
  if (normalized.includes('/components/')) return 'UI';
  if (normalized.includes('/pages/')) return 'UI';
  if (normalized.includes('/contracts/')) return 'CORE';
  if (normalized.includes('/governance/')) return 'CORE';
  if (normalized.includes('/engine/')) return 'CORE';
  if (normalized.includes('/core/')) return 'CORE';
  if (normalized.includes('/scripts/')) return 'CORE';
  if (normalized.includes('/utils/')) return 'UTIL';
  if (normalized.includes('/data/')) return 'DATA';
  if (normalized.includes('/firebase')) return 'DATA';
  return 'CORE';
}

function inferTag(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^[a-z]:/i, '');
  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/\.[^.]+$/, ''))
    .map((segment) => segment.replace(/[^a-zA-Z0-9]+/g, '_'))
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1_$2'))
    .map((segment) => segment.toUpperCase())
    .filter(Boolean);

  const region = inferRegion(relativePath);
  const tail = segments.slice(-3);
  while (tail.length < 3) {
    tail.unshift(region);
  }
  return `${region}.${tail.join('.')}.MAIN`;
}

function buildHeader(relativePath) {
  const region = inferRegion(relativePath);
  const tag = inferTag(relativePath);
  const fileName = path.basename(relativePath);

  return [
    '/*',
    'LEEWAY HEADER — DO NOT REMOVE',
    '',
    `REGION: ${region}`,
    `TAG: ${tag}`,
    'DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine',
    'AUTHORITY: LeeWay-Standards',
    `DISCOVERY_PIPELINE: ${DISCOVERY_PIPELINE}`,
    '',
    '5WH:',
    `WHAT = ${fileName} — governed module`,
    'WHY = Enforce LeeWay architectural standards in this file',
    'WHO = Leeway Industries / LeeWay Standards Enforcement Engine',
    `WHERE = ${relativePath.replace(/\\/g, '/')}`,
    'WHEN = 2026-04-18',
    'HOW = Auto-enforced header; update manually with full 5WH detail',
    '',
    'CHAIN: Standards → Integrated → Runtime → Projections',
    'LICENSE: PROPRIETARY',
    '*/',
    '',
  ].join('\n');
}

function hasRequiredMarkers(content) {
  return (
    content.includes('LEEWAY HEADER') &&
    content.includes('REGION:') &&
    content.includes('TAG:') &&
    content.includes('DISCOVERY_PIPELINE:')
  );
}

function patchExistingHeader(content, relativePath) {
  const lines = content.split(/\r?\n/);
  const patch = [];

  if (!content.includes('REGION:')) {
    patch.push(`REGION: ${inferRegion(relativePath)}`);
  }
  if (!content.includes('TAG:')) {
    patch.push(`TAG: ${inferTag(relativePath)}`);
  }
  if (!content.includes('DISCOVERY_PIPELINE:')) {
    patch.push(`DISCOVERY_PIPELINE: ${DISCOVERY_PIPELINE}`);
  }

  if (patch.length === 0) {
    return content;
  }

  const headerIndex = lines.findIndex((line) => line.includes('LEEWAY HEADER'));
  if (headerIndex === -1) {
    return buildHeader(relativePath) + content;
  }

  const insertIndex = Math.max(headerIndex + 1, 1);
  lines.splice(insertIndex, 0, '', ...patch);
  return `${lines.join('\n')}${content.endsWith('\n') ? '' : '\n'}`;
}

async function walk(targetPath, files) {
  const stat = await fs.stat(targetPath);
  if (stat.isFile()) {
    if (SUPPORTED_EXTENSIONS.has(path.extname(targetPath))) {
      files.push(targetPath);
    }
    return;
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_SEGMENTS.has(entry.name)) continue;
    await walk(path.join(targetPath, entry.name), files);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = options.include.length > 0 ? options.include : [options.root];
  const files = [];

  for (const target of targets) {
    await walk(target, files);
  }

  const results = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    const relativePath = path.relative(options.root, filePath) || path.basename(filePath);
    let nextContent = content;
    let changed = false;

    if (!content.includes('LEEWAY HEADER')) {
      nextContent = buildHeader(relativePath) + content;
      changed = true;
    } else if (!hasRequiredMarkers(content)) {
      nextContent = patchExistingHeader(content, relativePath);
      changed = nextContent !== content;
    }

    if (changed && options.apply) {
      await fs.writeFile(filePath, nextContent, 'utf8');
    }

    results.push({
      filePath,
      relativePath,
      changed,
      action: !changed ? 'keep' : options.apply ? 'patched' : 'would-patch',
    });
  }

  const changedCount = results.filter((result) => result.changed).length;
  const summary = {
    root: options.root,
    apply: options.apply,
    strict: options.strict,
    scanned: results.length,
    changed: changedCount,
    complianceScore: results.length === 0 ? 100 : Math.round(((results.length - changedCount) / results.length) * 100),
    results,
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!options.apply && changedCount > 0) {
    process.exit(2);
  }
  if (options.strict && changedCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});