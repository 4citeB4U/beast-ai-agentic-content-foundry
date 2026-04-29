/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.TYPES
TAG: VOICE.PROTOCOL.TYPES
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=mic
5WH:
  WHAT = Shared TypeScript types for the LeeWay Voice Loop system
  WHY  = Provides a single contract across STT, TTS, persona, and loop controller
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/types.ts
  WHEN = 2026
  HOW  = Pure type declarations — no runtime code
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// ── Voice loop state machine ──────────────────────────────────────────────────

export type VoiceLoopState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'muted' | 'unavailable';

// ── Runtime mode (mirrors guardian/runtime-mode.ts for client awareness) ──────

/** Mode A = rules only, Pi-safe. Mode B = balanced + LLM. Mode C = full. */
export type RuntimeMode = 'ultra-light' | 'balanced' | 'full';

// ── Speech queue types (re-exported for convenience) ─────────────────────────

export type SpeechPriority = 'high' | 'normal' | 'low';

// ── Conversation history ──────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Persona modes ─────────────────────────────────────────────────────────────

export const VOICE_MODES = {
  DEFAULT: 'default',
  CHARMING_PROFESSIONAL: 'charming_professional',
  PRODUCER_PROTOCOL: 'producer_protocol',
  RTC_OPS: 'rtc_ops',
} as const;

export type VoiceMode = typeof VOICE_MODES[keyof typeof VOICE_MODES];

// ── Voice event (emitted to the RTC event log) ─────────────────────────────

export interface VoiceEvent {
  id: string;
  timestamp: number;
  type: 'transcript' | 'response' | 'system';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source: 'STT' | 'BRAIN' | 'TTS' | 'LEE';
}

// ── WebSocket protocol (mirrors agentleevoice server protocol) ────────────────

export interface HelloEvent {
  type: 'hello';
  version: string;
  capabilities: string[];
  sample_rate: number;
  channels: number;
}

export interface InterruptEvent {
  type: 'interrupt';
}

export interface TextEvent {
  type: 'text';
  text: string;
}

export interface StateEvent {
  type: 'state';
  state: VoiceLoopState;
}

export interface PartialTranscriptEvent {
  type: 'partial_transcript';
  text: string;
  confidence: number;
}

export interface FinalTranscriptEvent {
  type: 'final_transcript';
  text: string;
  confidence: number;
}

export interface PartialResponseTextEvent {
  type: 'partial_response_text';
  text: string;
  token_index: number;
}

export interface FinalResponseTextEvent {
  type: 'final_response_text';
  text: string;
  route: 'local' | 'server';
}

export type ServerEvent =
  | StateEvent
  | PartialTranscriptEvent
  | FinalTranscriptEvent
  | PartialResponseTextEvent
  | FinalResponseTextEvent;
