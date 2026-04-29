/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.BEHAVIORTREE.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = BehaviorTree module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\BehaviorTree.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// Minimal Behavior Tree engine for agent logic
export type BTStatus = 'success' | 'failure' | 'running';

export interface BTNode {
  tick(context: any): BTStatus;
}

export class Sequence implements BTNode {
  constructor(public children: BTNode[]) {}
  tick(context: any): BTStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status !== 'success') return status;
    }
    return 'success';
  }
}

export class Selector implements BTNode {
  constructor(public children: BTNode[]) {}
  tick(context: any): BTStatus {
    for (const child of this.children) {
      const status = child.tick(context);
      if (status === 'success') return 'success';
      if (status === 'running') return 'running';
    }
    return 'failure';
  }
}

export class Leaf implements BTNode {
  constructor(public action: (context: any) => BTStatus) {}
  tick(context: any): BTStatus {
    return this.action(context);
  }
}
