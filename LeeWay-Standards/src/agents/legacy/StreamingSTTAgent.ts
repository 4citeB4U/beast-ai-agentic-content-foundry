/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.STREAMINGSTT.TRANSCRIBER

COLOR_ONION_HEX:
NEON=#A78BFA
FLUO=#C4B5FD
PASTEL=#EDE9FE

ICON_ASCII:
family=lucide
glyph=mic

5WH:
WHAT = StreamingSTTAgent — provides STT status and direct partial-transcript subscriptions from the EventBus
WHY = Lets UI components and other agents react to speech events without coupling directly to VoiceSession
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/StreamingSTTAgent.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
STREAMINGSTT

LICENSE:
MIT
*/

// agents/StreamingSTTAgent.ts
// Provides a query interface over the stt:* EventBus events emitted by LiveConductorAgent.
// The actual transcription runs server-side (faster-whisper + Silero VAD via voice server).

import { eventBus } from '../../core/EventBus';

export type TranscriptListener = (text: string, confidence: number) => void;
export type SpeechEventListener = () => void;

export class StreamingSTTAgent {
  private static _lastPartial = '';
  private static _isSpeaking = false;

  static {
    // Mirror stt events into local state for synchronous reads
    eventBus.on('stt:partial', ({ text, confidence }) => {
      StreamingSTTAgent._lastPartial = text;
    });
    eventBus.on('stt:speech_start', () => {
      StreamingSTTAgent._isSpeaking = true;
    });
    eventBus.on('stt:speech_end', () => {
      StreamingSTTAgent._isSpeaking = false;
      StreamingSTTAgent._lastPartial = '';
    });
  }

  /** Returns the most recent partial transcript text (empty string when silent). */
  static get lastPartial(): string {
    return StreamingSTTAgent._lastPartial;
  }

  /** True while VAD has detected active speech. */
  static get isSpeaking(): boolean {
    return StreamingSTTAgent._isSpeaking;
  }

  /**
   * Subscribe to partial transcripts.
   * @returns Unsubscribe function — call it to clean up.
   */
  static onPartial(listener: TranscriptListener): () => void {
    return eventBus.on('stt:partial', ({ text, confidence }) => listener(text, confidence));
  }

  /**
   * Subscribe to VAD speech-start events.
   * @returns Unsubscribe function.
   */
  static onSpeechStart(listener: SpeechEventListener): () => void {
    return eventBus.on('stt:speech_start', listener);
  }

  /**
   * Subscribe to VAD speech-end events.
   * @returns Unsubscribe function.
   */
  static onSpeechEnd(listener: (durationMs: number) => void): () => void {
    return eventBus.on('stt:speech_end', ({ durationMs }) => listener(durationMs));
  }

  /**
   * Subscribe to finalised transcripts (full turn, after speech-end).
   * @returns Unsubscribe function.
   */
  static onFinalTranscript(listener: (text: string) => void): () => void {
    return eventBus.on('user:voice', ({ transcript }) => listener(transcript));
  }
}
