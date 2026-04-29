/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: TYPES.VISION.SYSTEM.DEFINITIONS
REGION: 🧠 AI
PURPOSE: Shared types and interfaces for vision system

LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export type RuntimeMode = 'ultra-light' | 'balanced' | 'full';

export interface MonitorState {
  ts: number;
  brightness: number;
  blur: number;
  motion: number;
  facePresent: boolean;
  runtimeMode: RuntimeMode;
}

export interface VisionFact {
  observable: boolean;
  value: string | number | boolean;
  source: string;
}

export interface VisionSignal {
  name: string;
  numeric: number;
  min: number;
  max: number;
  unit: string;
}

export interface VisionReading {
  signal: string;
  value: number;
  confidence: number;
  timestamp: number;
}

export interface VisionConfidence {
  monitor: number;
  scan: number;
  inspect: number;
  overall: number;
}

export interface AwarenessPacket {
  ts: number;
  id: string;
  facts: VisionFact[];
  signals: Record<string, VisionSignal>;
  readings: VisionReading[];
  confidence: VisionConfidence;
  limits: string[];
  runtimeMode: RuntimeMode;
}

export interface GovernanceVerdictVision {
  allowed: string[];
  blocked: string[];
  warnings: string[];
  compliant: boolean;
}

export interface VisionDiagnostics {
  monitorActive: boolean;
  monitorLatency: number;
  lastScanTime: number;
  lastInspectTime: number;
  packetSize: number;
  cpuEstimate: number;
  runtimeMode: RuntimeMode;
}
