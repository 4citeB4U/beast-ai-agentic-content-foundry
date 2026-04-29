/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.WORLDSTATE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = WorldState module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\WorldState.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

export class WorldState {
  state: Record<string, any> = {};
  log: string[] = [];

  update(key: string, value: any) {
    this.state[key] = value;
    this.log.push(`World updated: ${key} = ${JSON.stringify(value)}`);
  }

  get(key: string) {
    return this.state[key];
  }
}
