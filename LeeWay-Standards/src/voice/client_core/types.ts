/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.SDK.TYPES.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = types module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = voice\client_core\types.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/**
 * types.ts – Shared TypeScript types for the Agent Lee WebSocket protocol.
 */

export type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type RouteMode = 'local' | 'leeway';

// ── Client → Server ──────────────────────────────────────────────────────────

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

// ── Server → Client ──────────────────────────────────────────────────────────

export interface StateEvent {
  type: 'state';
  state: AgentState;
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
  route: RouteMode;
}

export interface AudioOutMetadata {
  type: 'audio_out';
  sample_rate: number;
  channels: number;
  encoding: string;
  chunk_index: number;
  is_last: boolean;
}

export interface ErrorEvent {
  type: 'error';
  code: string;
  message: string;
}

export interface HelloAckEvent {
  type: 'hello_ack';
  session_id: string;
}

export type ServerEvent =
  | StateEvent
  | PartialTranscriptEvent
  | FinalTranscriptEvent
  | PartialResponseTextEvent
  | FinalResponseTextEvent
  | AudioOutMetadata
  | ErrorEvent
  | HelloAckEvent;

