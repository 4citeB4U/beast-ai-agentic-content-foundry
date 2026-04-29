/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.AGENTBASE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = AgentBase module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\AgentBase.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

export abstract class AgentBase {
  id: string;
  name: string;
  memory: string[];
  state: Record<string, any>;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
    this.memory = [];
    this.state = {};
  }

  abstract decide(event: any, world: any): AgentAction;
  remember(info: string) { this.memory.push(info); }
}

export interface AgentAction {
  type: string;
  [key: string]: any;
}
