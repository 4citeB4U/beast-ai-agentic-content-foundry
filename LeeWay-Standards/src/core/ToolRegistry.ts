/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.TOOLREGISTRY.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = ToolRegistry module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\ToolRegistry.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

export const ToolRegistry = {
  move: (agent, params) => {
    return { type: 'move', ...params };
  },
  speak: (agent, params) => {
    return { type: 'say', text: params.text };
  },
  // Add more tools/actions as needed
};
