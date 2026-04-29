/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.THIRD_PARTY_PRODUCT_VALIDATOR.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

5WH:
WHAT = third-party-product-validator — governed module
WHY = Qualify ecosystem submissions through automated LeeWay admission gates
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/contract-integrity/third-party-product-validator.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards -> Integrated -> Runtime -> Projections
LICENSE: PROPRIETARY
*/

const GOVERNANCE_PATTERNS = [/governance/i, /guardian/i, /law/i, /standards.*override/i, /legislat/i];
const RUNTIME_IMPORT_PATTERNS = [
  /^\s*import\b[^;]*(?:RTCInitializer|LeewayRTCClient|DeterministicConstructService|DeterministicVoxelEngine)/m,
  /^\s*import\b[^;]*from\s+["'][^"']*\/runtime\//m,
  /^\s*import\b[^;]*from\s+["'][^"']*\/standards\//m,
  /^\s*import\b[^;]*cortices\//m,
];
const MEMORY_MERGE_PATTERNS = [
  /Pallium.*(?:is|as|=).*(?:database|db|relational)/i,
  /Database Center.*(?:is|as|=).*(?:drive|file-memory)/i,
  /view\s*===\s*["']database["']/,
  /drives.*(?:tables|rows|columns)/i,
];

function normalizeLane(lane) {
  if (lane === "Projection" || lane === "Construct") return "ConstructSurface";
  if (lane === "MCP") return "MCPWorker";
  if (lane === "Data") return "DataModule";
  return "Hybrid";
}

function makeFinding(gate, severity, message, filePath) {
  return { gate, severity, message, filePath };
}

function isAgentLeeForm(value) {
  return /^Agent Lee\s+[—-]\s+.+/.test(String(value || "").trim());
}

export function validateThirdPartyProductSubmission(submission, sourceArtifacts = []) {
  const findings = [];
  const lane = submission?.integration?.requestedLane;
  const normalizedLane = normalizeLane(lane);

  if (!submission?.identity?.name?.trim()) {
    findings.push(makeFinding("identity", "blocking", "identity.name is required."));
  }
  if (!submission?.identity?.developer?.trim()) {
    findings.push(makeFinding("identity", "blocking", "identity.developer is required."));
  }
  if (!submission?.identity?.purpose?.trim()) {
    findings.push(makeFinding("identity", "blocking", "identity.purpose is required."));
  }
  if (!submission?.compliance?.hasTag || !submission?.compliance?.hasRegion || !submission?.compliance?.hasPipeline) {
    findings.push(makeFinding("identity", "blocking", "Submission must declare TAG, REGION, and DISCOVERY_PIPELINE compliance."));
  }

  if (submission?.authority?.claims !== "NONE") {
    findings.push(makeFinding("authority", "blocking", 'authority.claims must be "NONE".'));
  }
  if (!submission?.authority?.acknowledgesStandards || !submission?.authority?.acknowledgesNoSovereignty) {
    findings.push(makeFinding("authority", "blocking", "Submission must acknowledge Standards authority and no sovereignty."));
  }

  if (!submission?.memory?.respectsSeparation) {
    findings.push(makeFinding("memory", "blocking", "memory.respectsSeparation must be true."));
  }

  if (!isAgentLeeForm(submission?.integration?.agentForm)) {
    findings.push(makeFinding("agentForm", "blocking", 'integration.agentForm must match "Agent Lee - [Form Name]".'));
  }

  if (!submission?.visibility?.emitsReceipts || !submission?.visibility?.exposesHealthState || !submission?.visibility?.exposesAuditHooks) {
    findings.push(makeFinding("visibility", "blocking", "Submission must expose receipts, health state, and audit hooks."));
  }

  if ((lane === "Projection" || lane === "Construct" || lane === "Hybrid") && !submission?.integration?.mountsInto?.includes("RoomOnTheEdge")) {
    findings.push(makeFinding("agentForm", "blocking", "Projection, Construct, and Hybrid submissions must mount into RoomOnTheEdge."));
  }

  for (const artifact of sourceArtifacts) {
    for (const pattern of GOVERNANCE_PATTERNS) {
      if (pattern.test(artifact.content)) {
        findings.push(makeFinding("authority", "blocking", "Governance code or sovereignty language detected in submitted source.", artifact.filePath));
        break;
      }
    }
    for (const pattern of RUNTIME_IMPORT_PATTERNS) {
      if (pattern.test(artifact.content)) {
        findings.push(makeFinding("authority", "blocking", "Forbidden runtime or standards import detected in submitted source.", artifact.filePath));
        break;
      }
    }
    for (const pattern of MEMORY_MERGE_PATTERNS) {
      if (pattern.test(artifact.content)) {
        findings.push(makeFinding("memory", "blocking", "Pallium and Database Center boundary violation detected in submitted source.", artifact.filePath));
        break;
      }
    }
  }

  if (normalizedLane === "Hybrid") {
    findings.push(makeFinding("authority", "info", "Hybrid lane requested: strict review profile applies."));
  }

  return {
    qualified: findings.every((finding) => finding.severity !== "blocking"),
    lane,
    normalizedLane,
    findings,
  };
}