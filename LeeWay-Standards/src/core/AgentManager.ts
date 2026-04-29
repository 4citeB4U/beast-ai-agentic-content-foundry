/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.AGENTMANAGER.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = AgentManager module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\AgentManager.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

import { AgentBase, AgentAction } from './AgentBase';
import { AgentLeeBT } from '../agents/AgentLeeBT';

export class AgentManager {
  agents: AgentBase[];
  worldState: Record<string, any>;

  constructor() {
    this.agents = [new AgentLeeBT('lee', 'Agent Lee')];
    this.worldState = {};
  }

  async handleEvent(event: any) {
    for (const agent of this.agents) {
      let action = agent.decide(event, this.worldState);
      // If agent requests cognition assistance, call AgentCognition
      if (action && action.type === 'cognition_assist' && window.AgentCognition) {
        action.cognitionResult = await window.AgentCognition.generate(action.prompt);
      }
      this.executeAction(agent, action);
    }
  }

  executeAction(agent: AgentBase, action: AgentAction) {
    // Route to UI, update world, call tools, etc.
    // For now, just log
    console.log(`[${agent.name}] Action:`, action);
  }
}
