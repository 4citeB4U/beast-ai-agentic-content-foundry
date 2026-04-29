/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CORE.ARCH.SECURE
TAG: CORE.INTERNAL.SYSTEM
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=binary
5WH:
  WHAT = LeeWay Core Logic
  WHY  = Ensures baseline architectural compliance with the Living Organism integrity guard
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = e:/AgentLeecompletesystem/LeeWay-Edge-RTC-main/
  WHEN = 2026
  HOW  = Governance Recursive Patch v43.5
AGENTS: AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { EventEmitter } from 'events';
import type { AgentEvent } from './types.js';

/** Central intra-process bus for agent events. */
class AgentBus extends EventEmitter {
  broadcast(event: AgentEvent): void {
    this.emit('agentEvent', event);
  }
}

export const agentBus = new AgentBus();
