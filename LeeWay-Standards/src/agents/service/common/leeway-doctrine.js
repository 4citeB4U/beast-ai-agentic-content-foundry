/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: AI.AGENT.LEEWAY_DOCTRINE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = leeway-doctrine — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/common/leeway-doctrine.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

export const LEEWAY_DOCTRINE = {
  systemName: "LeeWay - The Structured Freedom System",
  oneLineDefinition:
    "LeeWay = Freedom to build, enforced through layers, executed through systems, and delivered through governed outcomes.",
  finalTruth:
    "Freedom survives at scale not by removing limits, but by designing them correctly.",
  governedPath: ["Standards", "Integrated", "Runtime"],
  pillars: {
    L: {
      name: "Layered Foundations",
      principle: "Freedom is contained without being restricted.",
      operationalMeaning: "Capabilities must remain in proper layers with clear ownership boundaries.",
    },
    E1: {
      name: "Execution Law",
      principle: "Freedom becomes intentional.",
      operationalMeaning: "Every operation follows the governed path Standards -> Integrated -> Runtime.",
    },
    E2: {
      name: "Environment and Engine",
      principle: "Freedom becomes possible.",
      operationalMeaning: "Execution runs inside managed environments and engines with policy controls.",
    },
    W: {
      name: "Workflow and Workforce",
      principle: "Freedom becomes productive.",
      operationalMeaning: "Agents and workflows execute structured tasks with receipts and traceability.",
    },
    A: {
      name: "Architecture and Agents",
      principle: "Freedom becomes stable.",
      operationalMeaning: "Architecture defines law and agents continuously enforce it.",
    },
    Y: {
      name: "Yield and System Output",
      principle: "Freedom becomes real results.",
      operationalMeaning: "The system must produce clean, scalable, and governed outcomes.",
    },
  },
};

export const LEEWAY_PHASE_4_RULE =
  "No more single-file MOVE operations. All future moves must be group-based and dependency-aware.";

export const LEEWAY_CORRECTIVE_PERMANENCE_LAW =
  "A solved structural problem is not fully solved until a dedicated Standards issue agent is registered to prevent recurrence.";

export function deriveLeeWayPhase(mode) {
  switch (mode) {
    case "scan":
      return "LAYERED_GOVERNANCE";
    case "purge-plan":
      return "WORKFLOW_PRODUCTIVITY";
    case "enforce":
      return "ARCHITECTURE_ENFORCEMENT";
    case "quarantine":
      return "CONTROLLED_EXECUTION";
    case "move-simulate":
      return "STRUCTURAL_RECOMPOSITION";
    case "move-analyze":
      return "STRUCTURAL_RECOMPOSITION";
    case "move-apply":
      return "STRUCTURAL_RECOMPOSITION";
    case "move-group-analyze":
      return "COORDINATED_RECOMPOSITION";
    case "move-group-apply":
      return "COORDINATED_RECOMPOSITION";
    case "move-resolve-blockers":
      return "COORDINATED_RECOMPOSITION";
    case "watch":
      return "CONTINUOUS_GOVERNANCE";
    case "ci":
      return "SYSTEM_YIELD_GATING";
    default:
      return "STRUCTURED_FREEDOM";
  }
}
