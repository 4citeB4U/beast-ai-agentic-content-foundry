/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: CORE.VISION.SYSTEM.ORCHESTRATOR
REGION: 🧠 AI
PURPOSE: Main orchestrator for vision system

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export { default as visionMonitor } from './vision-monitor';
export type { MonitorState } from './vision-monitor';

export { default as visionScanner } from './vision-scanner';
export type { ScanOutput } from './vision-scanner';

export { default as visionInspect } from './vision-inspect';
export type { InspectOutput } from './vision-inspect';

export { default as awarenessBuilder } from './vision-awareness';
export { default as visionGovernance } from './vision-governance';
export { default as visionAdapter } from './vision-adapter';
export type { AgentOutput } from './vision-adapter';

export { default as visionDiagnostics } from './vision-diagnostics';
export { default as visionBudget } from './vision-budget';
export type { BudgetCheck } from './vision-budget';

export { default as visionStorage } from './vision-storage';

export type {
  RuntimeMode,
  AwarenessPacket,
  VisionFact,
  VisionSignal,
  VisionReading,
  VisionConfidence,
  GovernanceVerdictVision,
  VisionDiagnostics,
} from './types';

/**
 * VISION SYSTEM ARCHITECTURE
 *
 * 1. MONITOR (Continuous)
 *    - Lightweight real-time analysis
 *    - Brightness, motion, blur detection
 *    - Face presence estimation
 *
 * 2. SCANNER (On-Demand)
 *    - Triggered region detection
 *    - Face bounding box
 *    - Text regions, scene tags
 *
 * 3. INSPECT (On-Demand)
 *    - Deep region analysis
 *    - OCR, facial signals
 *    - Clutter computation
 *
 * 4. AWARENESS (Aggregation)
 *    - Convert raw outputs to facts
 *    - Structure as signals & readings
 *    - Track confidence & limits
 *
 * 5. GOVERNANCE (Filtering)
 *    - Block dangerous claims
 *    - Require confidence thresholds
 *    - Enforce observable-only rules
 *
 * 6. ADAPTER (Agent Interface)
 *    - Safe suggestions & actions
 *    - User confirmations
 *    - Governance vetted output
 *
 * 7. DIAGNOSTICS (Monitoring)
 *    - Runtime visibility
 *    - Latency tracking
 *    - CPU/memory estimates
 *
 * 8. BUDGET (Resource Control)
 *    - Enforce edge constraints
 *    - Mode downgrading
 *    - Load estimation
 *
 * 9. STORAGE (Persistence)
 *    - Packet history
 *    - JSON compression
 *    - Bounded history
 *
 * DESIGN PRINCIPLES
 * - Observable facts only
 * - No emotional/medical certainty
 * - Governance-first filtering
 * - Lightweight & edge-safe
 * - Explainable & auditable
 */
