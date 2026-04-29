/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.LIVECONDUCTOR.PIPELINE

COLOR_ONION_HEX:
NEON=#06B6D4
FLUO=#22D3EE
PASTEL=#CFFAFE

ICON_ASCII:
family=lucide
glyph=radio

5WH:
WHAT = LiveConductorAgent — orchestrates the end-to-end realtime voice pipeline for each WebSocket session
WHY = Centralises session lifecycle, barge-in coordination, and pipeline state broadcasting via EventBus
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/LiveConductorAgent.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
LIVECONDUCTOR

LICENSE:
MIT
*/

// agents/LiveConductorAgent.ts
// Orchestrates the realtime voice pipeline (VAD → STT → Router → Agent Lee → TTS).
// Wraps VoiceSession and re-emits all events onto the system EventBus.

import { eventBus } from '../../core/EventBus';
import { VoiceSession, VoiceSessionCallbacks } from '../voice/client_core/VoiceSession';

let _session: VoiceSession | null = null;
let _sessionId = '';

const callbacks: VoiceSessionCallbacks = {
  onState(state) {
    eventBus.emit('conductor:state', { state, sessionId: _sessionId });
  },
  onPartialTranscript(text, confidence) {
    eventBus.emit('stt:partial', { text, confidence });
  },
  onFinalTranscript(text) {
    eventBus.emit('user:voice', { transcript: text, language: 'en', speakerId: _sessionId });
  },
  onToken(chunk) {
    eventBus.emit('vm:output', { chunk });
  },
  onResponse(text) {
    eventBus.emit('agent:done', { agent: 'LiveConductor', result: text });
  },
  onSessionId(id) {
    _sessionId = id;
    eventBus.emit('conductor:state', { state: 'idle', sessionId: id });
  },
  onError(_code, message) {
    eventBus.emit('agent:error', { agent: 'LiveConductor', error: message });
  },
  onSpeakingStart() {
    eventBus.emit('tts:speaking', { text: '', prosody: { pace: 'normal', pitch: 'normal', emotion: 'neutral' } });
  },
  onSpeakingEnd() {
    eventBus.emit('tts:done', { durationMs: 0 });
  },
};

export class LiveConductorAgent {
  /** Start the voice pipeline; connects to the WebSocket voice server. */
  static start(): void {
    if (_session) return; // already running
    _session = new VoiceSession(callbacks);
    _session.start();
    eventBus.emit('conductor:state', { state: 'idle', sessionId: '' });
    eventBus.emit('agent:active', { agent: 'LiveConductor', task: 'Voice pipeline started' });
  }

  /** Stop the pipeline and release all audio resources. */
  static async stop(): Promise<void> {
    if (!_session) return;
    await _session.stop();
    _session = null;
    eventBus.emit('conductor:state', { state: 'idle', sessionId: '' });
    eventBus.emit('agent:done', { agent: 'LiveConductor', result: 'Voice pipeline stopped' });
  }

  /** Send a barge-in interrupt — cuts TTS and resets to listening. */
  static interrupt(): void {
    _session?.interrupt();
    eventBus.emit('tts:cancelled', { reason: 'barge_in' });
  }

  /** Send a text turn instead of spoken audio. */
  static sendText(text: string): void {
    _session?.sendText(text);
    eventBus.emit('agent:active', { agent: 'LiveConductor', task: `Text turn: ${text.slice(0, 60)}` });
  }

  /** Whether a pipeline session is currently active. */
  static get isRunning(): boolean {
    return _session !== null;
  }
}
