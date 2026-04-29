/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.LEEWAY_RTC_SETUP.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = leeway-rtc-setup module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\leeway-rtc-setup.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// leeway-rtc-setup.ts
// Integration for Agent Lee with LeeWay Edge RTC using the official SDK

import { LeewaySDK, useRTCStore, CallModeUI } from 'leeway-edge-rtc';

// Replace with your actual API key and production signaling URL
const LEEWAY_API_KEY = import.meta.env.VITE_API_KEY || '<your-api-key-here>';
const SIGNALING_URL = import.meta.env.VITE_VOICE_WS_URL || 'wss://leeway-sfu.fly.dev/ws';

// Initialize the SDK with API key and endpoint
export const leewaySDK = new LeewaySDK(LEEWAY_API_KEY, { signalingUrl: SIGNALING_URL });

// Export hooks and UI for use in your app
export { useRTCStore, CallModeUI };
