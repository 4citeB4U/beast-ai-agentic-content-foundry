/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.STANDARDS_SERVICE_AGENTS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = standards-service-agents — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/common/standards-service-agents.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

const buildRequiredVmSurface = (agentId, title) => ({
  surfaceId: `vm.${agentId}`,
  title: `${title} VM`,
  route: `/construct/agent-vm/${agentId}`,
  required: true,
  fullIdentitySurface: true,
  standardsMonitored: true,
  monitorScope: [
    "authority",
    "mission",
    "receipts",
    "watch-scope",
    "runtime-status",
    "blocking-state",
    "standards-compliance",
  ],
});

export function assertStandardsAgentsHaveVmIdentity(agents) {
  const missingVmAgents = agents.filter(
    (agent) =>
      agent.identitySurface !== "agent-vm" ||
      !agent.vmSurface?.required ||
      !agent.vmSurface?.fullIdentitySurface ||
      !agent.vmSurface?.standardsMonitored,
  );

  if (missingVmAgents.length > 0) {
    throw new Error(
      `LeeWay Standards violation: every standards agent must expose an Agent VM as its full identity surface. Missing coverage: ${missingVmAgents
        .map((agent) => agent.agentId)
        .join(", ")}`,
    );
  }

  return agents;
}

export const STANDARDS_SERVICE_AGENTS = assertStandardsAgentsHaveVmIdentity([
  {
    agentId: "ssa-placement-auditor",
    title: "Placement Auditor",
    purpose: "Maintains ownership placement, projection boundaries, and nested repo contamination rules.",
    authority: "blocking",
    watchScope: ["ownership", "misplacement", "duplicates", "nested-repos"],
    mode: ["scan", "purge-plan", "watch", "ci"],
    packagePath: "packages/standards/agents/placement-auditor",
    entrypoint: "src/agents/service/placement-auditor/index.js",
    receiptAgent: "placement-auditor",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-placement-auditor", "Placement Auditor"),
  },
  {
    agentId: "ssa-import-sentinel",
    title: "Import Sentinel",
    purpose: "Maintains layer import law and forbidden edge enforcement.",
    authority: "blocking",
    watchScope: ["imports", "forbidden-edges", "projection-internal-bypass"],
    mode: ["scan", "enforce", "watch", "ci"],
    packagePath: "packages/standards/agents/import-sentinel",
    entrypoint: "src/agents/service/import-sentinel/index.js",
    receiptAgent: "import-sentinel",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-import-sentinel", "Import Sentinel"),
  },
  {
    agentId: "ssa-contract-integrity",
    title: "Contract Integrity",
    purpose: "Maintains standards contract integrity and schema drift detection.",
    authority: "warn",
    watchScope: ["contracts", "schemas", "drift"],
    mode: ["scan", "enforce", "watch", "ci"],
    packagePath: "packages/standards/agents/contract-integrity",
    entrypoint: "src/agents/service/contract-integrity/index.js",
    receiptAgent: "contract-integrity",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-contract-integrity", "Contract Integrity"),
  },
  {
    agentId: "ssa-dead-code-reaper",
    title: "Dead Code Reaper",
    purpose: "Maintains structural hygiene and classifies stale or dead assets.",
    authority: "warn",
    watchScope: ["orphans", "placeholders", "dead-folders", "stale-artifacts"],
    mode: ["purge-plan", "watch", "ci"],
    packagePath: "packages/standards/agents/dead-code-reaper",
    entrypoint: "src/agents/service/dead-code-reaper/index.js",
    receiptAgent: "dead-code-reaper",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-dead-code-reaper", "Dead Code Reaper"),
  },
  {
    agentId: "ssa-quarantine-executor",
    title: "Quarantine Executor",
    purpose: "Maintains non-destructive structural isolation through approved quarantine batches.",
    authority: "warn",
    watchScope: ["approved-quarantine-rows", "quarantine-targets", "missing-sources"],
    mode: ["quarantine", "watch", "ci"],
    packagePath: "packages/standards/agents/quarantine-executor",
    entrypoint: "src/agents/service/quarantine-executor/index.js",
    receiptAgent: "quarantine-executor",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-quarantine-executor", "Quarantine Executor"),
  },
  {
    agentId: "ssa-rehome-orchestrator",
    title: "Rehome Orchestrator",
    purpose: "Maintains safe MOVE preparation through mapping, simulation, and import impact staging.",
    authority: "blocking",
    watchScope: ["move-map", "import-impact", "dependency-depth", "rewrite-plan"],
    mode: ["move-simulate", "move-analyze", "move-group-analyze", "move-resolve-blockers", "move-apply", "watch", "ci"],
    packagePath: "packages/standards/agents/rehome-orchestrator",
    entrypoint: "src/agents/service/rehome-orchestrator/index.js",
    receiptAgent: "rehome-orchestrator",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-rehome-orchestrator", "Rehome Orchestrator"),
  },
  {
    agentId: "ssa-runtime-chain-guardian",
    title: "Runtime Chain Guardian",
    purpose: "Maintains execution law for Standards -> Integrated -> Runtime chain.",
    authority: "blocking",
    watchScope: ["chain-bypass", "runtime-ownership-drift", "projection-runtime-overreach"],
    mode: ["scan", "enforce", "watch", "ci"],
    packagePath: "packages/standards/agents/runtime-chain-guardian",
    entrypoint: "src/agents/service/runtime-chain-guardian/index.js",
    receiptAgent: "runtime-chain-guardian",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-runtime-chain-guardian", "Runtime Chain Guardian"),
  },
  {
    agentId: "ssa-receipt-audit",
    title: "Receipt Auditor",
    purpose: "Maintains forensic truth across agent runs and structural operations.",
    authority: "info",
    watchScope: ["receipts", "run-history", "batch-evidence"],
    mode: ["scan", "purge-plan", "quarantine", "watch", "ci"],
    packagePath: "packages/standards/agents/receipt-audit",
    entrypoint: "src/agents/service/receipt-audit/index.js",
    receiptAgent: "receipt-audit",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-receipt-audit", "Receipt Auditor"),
  },
  {
    agentId: "ssa-health-monitor",
    title: "Health Monitor",
    purpose: "Maintains service heartbeat, stale-run detection, and blocking-state awareness.",
    authority: "info",
    watchScope: ["heartbeat", "last-run", "blocking-count", "agent-failures"],
    mode: ["scan", "watch", "ci"],
    packagePath: "packages/standards/agents/health-monitor",
    entrypoint: "src/agents/service/health-monitor/index.js",
    receiptAgent: "health-monitor",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-health-monitor", "Health Monitor"),
  },
  {
    agentId: "ssa-data-lineage-tracker",
    title: "Data Lineage Tracker",
    purpose: "Maintains full inventory classification, ownership lineage, and purge ledger generation.",
    authority: "blocking",
    watchScope: ["classification", "ownership", "duplicates", "orphans", "import-breaks"],
    mode: ["scan", "purge-plan", "watch", "ci"],
    packagePath: "packages/standards/agents/data-lineage-tracker",
    entrypoint: "src/agents/service/data-lineage-tracker/index.js",
    receiptAgent: "data-lineage-tracker",
    identitySurface: "agent-vm",
    vmSurface: buildRequiredVmSurface("ssa-data-lineage-tracker", "Data Lineage Tracker"),
  },
]);
