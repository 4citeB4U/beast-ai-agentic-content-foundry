#!/usr/bin/env node
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.VALIDATE_THIRD_PARTY_PRODUCT.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

5WH:
WHAT = validate-third-party-product — governed module
WHY = Provide frictionless but sovereign admission checks for ecosystem submissions
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = scripts/validate-third-party-product.mjs
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards -> Integrated -> Runtime -> Projections
LICENSE: PROPRIETARY
*/


import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateThirdPartyProductSubmission } from "../src/agents/service/contract-integrity/third-party-product-validator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, "..");

async function main() {
  const [manifestArg, ...sourceArgs] = process.argv.slice(2);

  if (!manifestArg) {
    console.error("Usage: node scripts/validate-third-party-product.mjs <manifest.json> [source-file ...]");
    process.exit(1);
  }

  const manifestPath = path.isAbsolute(manifestArg) ? manifestArg : path.join(standardsRoot, manifestArg);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  const sourceArtifacts = [];
  for (const sourceArg of sourceArgs) {
    const sourcePath = path.isAbsolute(sourceArg) ? sourceArg : path.join(standardsRoot, sourceArg);
    sourceArtifacts.push({
      filePath: sourceArg,
      content: await fs.readFile(sourcePath, "utf8"),
    });
  }

  const result = validateThirdPartyProductSubmission(manifest, sourceArtifacts);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.qualified ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});