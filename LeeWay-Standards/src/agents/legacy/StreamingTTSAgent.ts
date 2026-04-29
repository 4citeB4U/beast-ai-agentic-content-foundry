/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.STREAMINGTTS.SYNTHESIZER

COLOR_ONION_HEX:
NEON=#F472B6
FLUO=#F9A8D4
PASTEL=#FCE7F3

ICON_ASCII:
family=lucide
glyph=volume-2

5WH:
WHAT = StreamingTTSAgent — exposes TTS state and subscriptions over the EventBus for UI / other agents
WHY = UI components can react to speaking/done/cancelled events without coupling to VoiceSession directly
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/StreamingTTSAgent.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
STREAMINGTTS

LICENSE:
MIT
*/

// agents/StreamingTTSAgent.ts
// Query interface over tts:* EventBus events emitted by LiveConductorAgent.
// Actual synthesis runs server-side (Piper TTS via voice server).

import { eventBus } from '../../core/EventBus';

export type ProsodyPlan = { pace: string; pitch: string; emotion: string };

export class StreamingTTSAgent {
  private static _isSpeaking = false;
  private static _currentText = '';
  private static _currentProsody: ProsodyPlan = { pace: 'normal', pitch: 'normal', emotion: 'neutral' };

  static {
    eventBus.on('tts:speaking', ({ text, prosody }) => {
      StreamingTTSAgent._isSpeaking = true;
      StreamingTTSAgent._currentText = text;
      StreamingTTSAgent._currentProsody = prosody;
    });
    eventBus.on('tts:done', () => {
      StreamingTTSAgent._isSpeaking = false;
      StreamingTTSAgent._currentText = '';
    });
    eventBus.on('tts:cancelled', () => {
      StreamingTTSAgent._isSpeaking = false;
      StreamingTTSAgent._currentText = '';
    });
  }

  /** Whether the TTS engine is currently producing audio. */
  static get isSpeaking(): boolean {
    return StreamingTTSAgent._isSpeaking;
  }

  /** The full utterance text currently being spoken (empty when silent). */
  static get currentText(): string {
    return StreamingTTSAgent._currentText;
  }

  /** The prosody plan applied to the current utterance. */
  static get currentProsody(): ProsodyPlan {
    return { ...StreamingTTSAgent._currentProsody };
  }

  /** Subscribe to TTS speaking-start events. Returns unsubscribe function. */
  static onSpeaking(listener: (text: string, prosody: ProsodyPlan) => void): () => void {
    return eventBus.on('tts:speaking', ({ text, prosody }) => listener(text, prosody));
  }

  /** Subscribe to TTS utterance-complete events. Returns unsubscribe function. */
  static onDone(listener: (durationMs: number) => void): () => void {
    return eventBus.on('tts:done', ({ durationMs }) => listener(durationMs));
  }

  /** Subscribe to TTS barge-in cancellation events. Returns unsubscribe function. */
  static onCancelled(listener: (reason: 'barge_in' | 'interrupt') => void): () => void {
    return eventBus.on('tts:cancelled', ({ reason }) => listener(reason));
  }
}
