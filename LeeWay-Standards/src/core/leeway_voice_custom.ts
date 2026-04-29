/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.LEEWAY_VOICE_CUSTOM.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = leeway_voice_custom module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\leeway_voice_custom.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// Stub for LeeWayVoiceConfig to resolve import error
export interface LeeWayVoiceConfig {
  voiceId: string;
  pitch?: number;
  rate?: number;
  volume?: number;
  language?: string;
  [key: string]: any;
}
