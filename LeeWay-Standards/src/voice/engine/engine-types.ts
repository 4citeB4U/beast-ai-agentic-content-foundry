/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.ENGINE
TAG: VOICE.ENGINE.TYPES
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
5WH:
  WHAT = Complete TypeScript type definitions for Voice Matching + Modulation Engine
  WHY  = Enables strict type safety across workflow controller, UI, and agents
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/engine-types.ts
  WHEN = 2026
  HOW  = Defines contracts for support, analysis, matching, modulation, persistence
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export type VoicePhase =
  | 'idle'
  | 'boot'
  | 'capture'
  | 'analyze'
  | 'profile'
  | 'match'
  | 'modulate'
  | 'preview'
  | 'save'
  | 'ready'
  | 'error';

export type ToneFamily = 'deep' | 'balanced' | 'bright';
export type Stability = 'stable' | 'variable' | 'unknown';
export type ModulationPreset = 'Natural' | 'Deep' | 'Bright' | 'Broadcast';

export interface SupportMatrix {
  getUserMedia: boolean;
  audioContext: boolean;
  speechSynthesis: boolean;
  storage: boolean;
}

export interface VoiceCatalogItem {
  name: string;
  lang: string;
  localService: boolean;
  default: boolean;
  normalizedName: string;
  tags: string[];
}

export interface SampleMeta {
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number;
  signalDetected: boolean;
  streamActive: boolean;
}

export interface VoiceAnalysis {
  pitchHz: number;
  energyAvg: number;
  energyPeak: number;
  toneFamily: ToneFamily;
  stability: Stability;
  qualityScore: number;
}

export interface VoiceProfile {
  id: string;
  label: string;
  pitchHz: number;
  energyAvg: number;
  toneFamily: ToneFamily;
  stability: Stability;
  preferredVoice: string | null;
  preferredPreset: ModulationPreset | null;
  createdAt: number;
  updatedAt: number;
}

export interface MatchCandidate {
  name: string;
  score: number;
  reason: string[];
}

export interface MatchResult {
  recommended: MatchCandidate | null;
  alternatives: MatchCandidate[];
  selectedVoiceName: string | null;
}

export interface ModulationConfig {
  preset: ModulationPreset;
  rate: number;
  pitch: number;
  volume: number;
  lowShelfGain: number;
  highShelfGain: number;
  compressorRatio: number;
}

export interface PreviewResult {
  previewText: string;
  played: boolean;
  userApproved: boolean;
}

export interface SavedConfig {
  id: string;
  profileId: string;
  voiceName: string;
  preset: ModulationPreset;
  rate: number;
  pitch: number;
  volume: number;
  savedAt: number;
}

export interface VoiceEngineState {
  phase: VoicePhase;
  support: SupportMatrix | null;
  voiceCatalog: VoiceCatalogItem[];
  savedProfiles: VoiceProfile[];
  savedConfig: SavedConfig | null;

  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
  mediaStreamSource: MediaStreamAudioSourceNode | null;

  sampleBuffer: Float32Array | null;
  sampleMeta: SampleMeta;

  analysis: VoiceAnalysis | null;
  profile: VoiceProfile | null;
  matchResult: MatchResult | null;
  modulation: ModulationConfig | null;
  previewResult: PreviewResult | null;

  errors: string[];
  nextAllowedPhase: VoicePhase | null;
}

export interface AgentInstruction {
  title: string;
  message: string;
  actionLabel: string | null;
  blockNext: boolean;
}
