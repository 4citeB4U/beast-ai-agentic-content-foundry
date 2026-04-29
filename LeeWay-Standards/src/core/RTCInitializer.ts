/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.RTC.INITIALIZATION
TAG: CORE.RTC.VOICE_VISION.STARTUP

COLOR_ONION_HEX:
NEON=#00FFD1
FLUO=#00B4FF
PASTEL=#C7F0FF

ICON_ASCII:
family=lucide
glyph=radio

5WH:
WHAT = RTC Initializer — Ensures Agent Lee is always connected for voice AND vision
WHY = Central startup routine for full multimedia connectivity; voice commands + visual context
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/RTCInitializer.ts
WHEN = 2026-04-07

AGENTS:
ARIA (Voice Coordinator)
OBSERVER (Vision AI)
NEXUS (Orchestration)

LICENSE:
MIT
*/

// RTCInitializer moved to cortices/sensory/RTCInitializer.ts
// Use dynamic import to load RTCInitializer when needed.
export * from '../cortices/sensory/RTCInitializer';
