// Attach a minimal CollectiveRuntime to globalThis for runtime integrity checks
export class CollectiveRuntime {
  static getState() {
    return { activeWorkflowId: null };
  }
}

// Extend globalThis type to include CollectiveRuntime
declare global {
  // eslint-disable-next-line no-var
  var CollectiveRuntime: CollectiveRuntime | undefined;
}
/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.AGENTLEECOLLECTIVERUNTIME.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = AgentLeeCollectiveRuntime module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\AgentLeeCollectiveRuntime.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

/*
 * AGENT LEE COLLECTIVE RUNTIME — SOVEREIGN SYNTHESIS LAYER
 * Phase 3: Sensory Synchronization — PerceptionBuffer & Synthesis
 */
import { PerceptionBus, PerceptionEvent } from './PerceptionBus';

// Fixed-size ring buffer for last N events (no GC pressure from array recreation)
class PerceptionBuffer {
  private voiceBuffer: (PerceptionEvent | null)[];
  private visionBuffer: (PerceptionEvent | null)[];
  private voiceHead = 0;
  private visionHead = 0;
  private voiceCount = 0;
  private visionCount = 0;
  private readonly capacity: number;
  private windowMs: number;

  constructor(windowMs = 5000, capacity = 64) {
    this.windowMs = windowMs;
    this.capacity = capacity;
    this.voiceBuffer = new Array(capacity).fill(null);
    this.visionBuffer = new Array(capacity).fill(null);
  }

  add(event: PerceptionEvent) {
    if (event.type === 'voice') {
      this.voiceBuffer[this.voiceHead] = event;
      this.voiceHead = (this.voiceHead + 1) % this.capacity;
      if (this.voiceCount < this.capacity) this.voiceCount++;
    } else if (event.type === 'vision') {
      this.visionBuffer[this.visionHead] = event;
      this.visionHead = (this.visionHead + 1) % this.capacity;
      if (this.visionCount < this.capacity) this.visionCount++;
    }
  }

  /** Get recent voice events within the time window */
  getRecentVoice(): PerceptionEvent[] {
    return this.getRecent(this.voiceBuffer, this.voiceHead, this.voiceCount);
  }

  /** Get recent vision events within the time window */
  getRecentVision(): PerceptionEvent[] {
    return this.getRecent(this.visionBuffer, this.visionHead, this.visionCount);
  }

  private getRecent(buf: (PerceptionEvent | null)[], head: number, count: number): PerceptionEvent[] {
    const now = Date.now();
    const result: PerceptionEvent[] = [];
    for (let i = 0; i < count; i++) {
      const idx = (head - 1 - i + this.capacity) % this.capacity;
      const evt = buf[idx];
      if (!evt || now - evt.timestamp > this.windowMs) break;
      result.push(evt);
    }
    return result;
  }

  synthesizeIntent(onSynthesis: (intent: string, context: any) => void) {
    // Called on every VOICE_PACKET
    const recentVoice = this.getRecentVoice();
    const lastVoice = recentVoice[0]; // most recent
    const recentVision = this.getRecentVision();
    // Example synthesis logic
    if (lastVoice && recentVision.length) {
      let transcript = '';
      if (lastVoice.payload && (lastVoice.payload as any).kind === 'voice') {
        transcript = ((lastVoice.payload as import('./PerceptionBus').VoicePayload).transcript || '').toLowerCase();
      }
      const visionDesc = recentVision.map(v => {
        if (v.payload && (v.payload as any).kind === 'vision') {
          return (v.payload as import('./PerceptionBus').VisionPayload).sceneDescription || '';
        }
        return '';
      }).join(' ');
      if (transcript.includes('fix') && visionDesc.includes('error')) {
        onSynthesis('BUILD_CORTEX_REPAIR', { transcript, visionDesc });
        return 'BUILD_CORTEX_REPAIR';
      }
    }
    // Default: fallback
    onSynthesis('DEFAULT', {});
    return 'DEFAULT';
  }
}

// Sovereign Interpreter
export class SovereignInterpreter {
  private buffer = new PerceptionBuffer();
  private bus = PerceptionBus.getInstance();

  constructor() {
    this.bus.subscribe('voice', (event) => {
      this.buffer.add(event);
      this.buffer.synthesizeIntent((intent, ctx) => {
        console.log(`[Sovereign] Multimodal synthesis:`, intent, ctx);
        if (intent === 'BUILD_CORTEX_REPAIR') {
          // Route to Build Cortex, etc.
          console.log('[Sovereign] Multimodal synthesis successful. Routing to Build Cortex.');
        }
      });
    });
    this.bus.subscribe('vision', (event) => {
      this.buffer.add(event);
    });
  }
}

let sovereignInstance: SovereignInterpreter | null = null;

export function getSovereignInterpreter(): SovereignInterpreter {
  if (!sovereignInstance) {
    sovereignInstance = new SovereignInterpreter();
  }
  return sovereignInstance;
}
