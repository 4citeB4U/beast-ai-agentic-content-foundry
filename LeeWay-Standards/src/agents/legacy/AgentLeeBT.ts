/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI
TAG: CORE.SDK.AGENTLEEBT.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = AgentLeeBT module
WHY = Part of AI region
WHO = LEEWAY Align Agent
WHERE = agents\AgentLeeBT.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

import { AgentBase } from '../../core/AgentBase';
import { BTNode, Sequence, Selector, Leaf } from '../../core/BehaviorTree';

export class AgentLeeBT extends AgentBase {
  tree: BTNode;
  constructor(id: string, name: string) {
    super(id, name);
    this.tree = new Selector([
      new Sequence([
        new Leaf(ctx => ctx.event.type === 'greet' ? (ctx.say('Hello!'), 'success') : 'failure'),
      ]),
      new Leaf(ctx => (ctx.idle(), 'success')),
    ]);
  }
  decide(event: any, world: any) {
    const context = { ...this, event, world, say: (t: string) => this.memory.push('Said: ' + t), idle: () => this.memory.push('Idle') };
    this.tree.tick(context);
    return { type: 'done', memory: this.memory.slice(-5) };
  }
}
