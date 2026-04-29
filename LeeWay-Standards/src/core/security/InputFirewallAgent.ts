/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: SECURITY.VALIDATOR.INPUTFIREWALLAGENT.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = InputFirewallAgent module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\security\InputFirewallAgent.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

// core/security/InputFirewallAgent.ts
import { PerceptionBus } from '../PerceptionBus.ts';
import type { PerceptionEvent } from '../PerceptionBus.ts';

const INJECTION_PATTERNS = [
  /ignore instructions/i,
  /bypass governance/i,
  /delete the database/i,
  /disable security/i,
  /run code without approval/i,
  /override system/i
];

export class InputFirewallAgent {
  private bus = PerceptionBus.getInstance();
  private frozen = false;

  constructor() {
    this.bus.subscribe('*', this.scan.bind(this));
  }

  scan(event: PerceptionEvent) {
    if (this.frozen) return;
    let text = '';
    if (event.payload && typeof event.payload === 'object') {
      if ('transcript' in event.payload && typeof event.payload.transcript === 'string') {
        text = event.payload.transcript;
      } else if ('sceneDescription' in event.payload && typeof event.payload.sceneDescription === 'string') {
        text = event.payload.sceneDescription;
      }
    }
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        this.emitBlock(event, text);
        this.freezeCollective();
        return;
      }
    }
  }

  emitBlock(event: PerceptionEvent, text: string) {
    this.bus.publish({
      id: `security_block_${Date.now()}`,
      type: 'SECURITY_BLOCK',
      source: 'InputFirewall',
      timestamp: Date.now(),
      payload: {
        reason: 'Prompt Injection Detected',
        offendingText: text,
        originalEvent: event
      } as import('../PerceptionBus').SecurityBlockPayload
    });
    console.log('[InputFirewall] Injection Attempt Blocked. System Lockdown Initiated. Receipt logged to Memory Lake.');
  }

  freezeCollective() {
    this.frozen = true;
    // Simulate freezing the runtime
    if (globalThis.CollectiveRuntime) {
      globalThis.CollectiveRuntime.frozen = true;
    }
  }
}

// Boot the firewall
export const inputFirewall = new InputFirewallAgent();
