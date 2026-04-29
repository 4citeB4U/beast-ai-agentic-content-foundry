/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.TTSBRIDGE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = ttsBridge module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\ttsBridge.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// Agent Lee OS TTS WebSocket client utility
// Usage: import and call sendTTS(text)

const TTS_WS_URL = 'ws://localhost:8766';
let ws = null;

export function connectTTSWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  ws = new WebSocket(TTS_WS_URL);
  ws.onopen = () => console.log('[AgentLee TTS] Connected to LeeWay-Edge-RTC TTS bridge');
  ws.onclose = () => console.warn('[AgentLee TTS] Disconnected from TTS bridge');
  ws.onerror = err => console.error('[AgentLee TTS] WebSocket error', err);
  ws.onmessage = msg => {
    // Optionally handle status/ack from bridge
    try {
      const data = JSON.parse(msg.data);
      if (data.status) console.log('[AgentLee TTS]', data.status);
      if (data.error) console.error('[AgentLee TTS]', data.error);
    } catch {}
  };
}

export function sendTTS(text) {
  if (!ws || ws.readyState !== WebSocket.OPEN) connectTTSWebSocket();
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ text }));
  } else {
    console.warn('[AgentLee TTS] TTS bridge not connected');
  }
}
