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
WHERE = src/agents/service/contract-integrity/index.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from "node:fs/promises";
import path from "node:path";
import { makeReceipt } from "../common/receipts.js";
import { validateThirdPartyProductSubmission } from "./third-party-product-validator.js";

export async function runContractIntegrity(ctx = {}, options = {}) {
  const receipts = [];
  const thirdPartyProductPath = options.thirdPartyProductPath;

  if (!thirdPartyProductPath) {
    receipts.push(
      makeReceipt({
        agent: "contract-integrity",
        severity: "info",
        pathValue: "contracts",
        issue: "Contract integrity checks are ready, including automated third-party admission validation via packages/standards/cli/admission.mjs.",
        action: "KEEP",
      }),
    );
    return receipts;
  }

  const manifestPath = path.isAbsolute(thirdPartyProductPath)
    ? thirdPartyProductPath
    : path.join(ctx.workspaceRoot || ctx.standardsRoot || process.cwd(), thirdPartyProductPath);

  let rawManifest;
  try {
    rawManifest = await fs.readFile(manifestPath, "utf8");
  } catch (error) {
    return [
      makeReceipt({
        agent: "contract-integrity",
        severity: "blocking",
        pathValue: thirdPartyProductPath,
        issue: `Third-party admission manifest could not be read: ${error.message}`,
        action: "QUARANTINE",
      }),
    ];
  }

  let manifest;
  try {
    manifest = JSON.parse(rawManifest);
  } catch (error) {
    return [
      makeReceipt({
        agent: "contract-integrity",
        severity: "blocking",
        pathValue: thirdPartyProductPath,
        issue: `Third-party admission manifest is not valid JSON: ${error.message}`,
        action: "QUARANTINE",
      }),
    ];
  }

  const sourceArtifacts = [];
  for (const sourcePath of options.sourcePaths || []) {
    const absoluteSourcePath = path.isAbsolute(sourcePath)
      ? sourcePath
      : path.join(ctx.workspaceRoot || ctx.standardsRoot || process.cwd(), sourcePath);
    try {
      sourceArtifacts.push({
        filePath: sourcePath,
        content: await fs.readFile(absoluteSourcePath, "utf8"),
      });
    } catch (error) {
      receipts.push(
        makeReceipt({
          agent: "contract-integrity",
          severity: "warn",
          pathValue: sourcePath,
          issue: `Source artifact skipped during admission validation: ${error.message}`,
          action: "KEEP",
        }),
      );
    }
  }

  const result = validateThirdPartyProductSubmission(manifest, sourceArtifacts);
  for (const finding of result.findings) {
    receipts.push(
      makeReceipt({
        agent: "contract-integrity",
        severity: finding.severity,
        pathValue: finding.filePath || thirdPartyProductPath,
        issue: `[${finding.gate}] ${finding.message}`,
        action: finding.severity === "blocking" ? "QUARANTINE" : "KEEP",
        autoFixable: false,
        details: {
          lane: result.lane,
          normalizedLane: result.normalizedLane,
          thirdPartyProductPath,
        },
      }),
    );
  }

  if (result.qualified) {
    receipts.push(
      makeReceipt({
        agent: "contract-integrity",
        severity: "info",
        pathValue: thirdPartyProductPath,
        issue: `Third-party submission qualified for ${result.normalizedLane}.`,
        action: "KEEP",
        details: {
          lane: result.lane,
          normalizedLane: result.normalizedLane,
          sourceArtifactCount: sourceArtifacts.length,
        },
      }),
    );
  }

  return receipts;
}
