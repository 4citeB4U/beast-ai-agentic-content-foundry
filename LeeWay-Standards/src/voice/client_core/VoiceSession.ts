/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: AI.ORCHESTRATION.VOICE.CLIENT
TAG: AI.ORCHESTRATION.VOICE.CLIENT.SESSION

COLOR_ONION_HEX:
NEON=#7C3AED
FLUO=#8B5CF6
PASTEL=#DDD6FE

ICON_ASCII:
family=lucide
glyph=radio

5WH:
WHAT = VoiceSession — React-friendly adapter bridging voice/client_core into the Agent Lee UI
WHY = Keeps voice/client_core protocol files unchanged (stable contract) while giving React pages a clean hook-friendly API
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = voice/client_core/VoiceSession.ts
WHEN = 2026
HOW = Wraps AgentLeeSocket + AudioCapture + AudioPlayback; exposes start/stop/interrupt + event callbacks; wires local energy barge-in

AGENTS:
ASSESS
AUDIT
LIVECONDUCTOR
STREAMINGSTT
STREAMINGTTS

LICENSE:
MIT
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// voice/client_core/VoiceSession.ts
// Single import for React pages to start/stop a full voice session.
// Usage:
//   const session = new VoiceSession({ onState, onFinalTranscript, onResponse });
//   await session.start();   // requests mic permission
//   session.stop();          // tears everything down cleanly
//   session.interrupt();     // barge-in from a button

import { AudioCapture, AudioPlayback } from './audio';
import { AgentLeeSocket } from './websocket';
import type {
  AgentState,
  StateEvent,
  PartialTranscriptEvent,
  FinalTranscriptEvent,
  PartialResponseTextEvent,
  FinalResponseTextEvent,
  AudioOutMetadata,
  ErrorEvent,
  HelloAckEvent,
} from './types';

// VITE_VOICE_WS_URL must be set in .env.local
const WS_URL: string = (() => {
  try {
    return (import.meta as { env: Record<string, string> }).env.VITE_VOICE_WS_URL
      ?? 'ws://localhost:8765/ws';
  } catch {
    return 'ws://localhost:8765/ws';
  }
})();

// Client-side energy smoother for barge-in detection (no extra VAD model needed)
const BARGE_IN_THRESHOLD = 0.012;

// ── Callback surface ──────────────────────────────────────────────────────────

export interface VoiceSessionCallbacks {
  /** Server changed its state machine: idle | listening | thinking | speaking */
  onState?: (state: AgentState) => void;
  /** Partial STT transcript (streaming from Whisper) */
  onPartialTranscript?: (text: string, confidence: number) => void;
  /** Final confirmed STT transcript for this turn */
  onFinalTranscript?: (text: string, confidence: number) => void;
  /** Streamed LLM token(s) */
  onToken?: (text: string, tokenIndex: number) => void;
  /** Full final LLM response + which model handled it */
  onResponse?: (text: string, route: 'local' | 'leeway') => void;
  /** Session ID returned by the server after hello_ack */
  onSessionId?: (id: string) => void;
  /** Any error from server or mic */
  onError?: (code: string, message: string) => void;
  /** Called when audio playback actually starts (first PCM chunk received) */
  onSpeakingStart?: () => void;
  /** Called when final audio_out chunk received (is_last=true) */
  onSpeakingEnd?: () => void;
}

// ── VoiceSession ──────────────────────────────────────────────────────────────

export class VoiceSession {
  private socket: AgentLeeSocket;
  private capture: AudioCapture | null = null;
  private playback: AudioPlayback;
  private energySmoother = 0;
  private _running = false;
  private _expectingAudioEnd = false;

  constructor(private callbacks: VoiceSessionCallbacks = {}) {
    this.socket = new AgentLeeSocket(WS_URL);
    this.playback = new AudioPlayback(22050);
    this._wireSocketEvents();
  }

  // ── Socket event wiring ───────────────────────────────────────────────────

  private _wireSocketEvents(): void {
    this.socket.on<StateEvent>('state', (e) => {
      this.callbacks.onState?.(e.state);
    });

    this.socket.on<PartialTranscriptEvent>('partial_transcript', (e) => {
      this.callbacks.onPartialTranscript?.(e.text, e.confidence);
    });

    this.socket.on<FinalTranscriptEvent>('final_transcript', (e) => {
      this.callbacks.onFinalTranscript?.(e.text, e.confidence);
    });

    this.socket.on<PartialResponseTextEvent>('partial_response_text', (e) => {
      this.callbacks.onToken?.(e.text, e.token_index);
    });

    this.socket.on<FinalResponseTextEvent>('final_response_text', (e) => {
      this.callbacks.onResponse?.(e.text, e.route);
    });

    this.socket.on<AudioOutMetadata>('audio_out', (e) => {
      if (e.is_last) {
        this._expectingAudioEnd = true;
      }
    });

    this.socket.onAudio((buf) => {
      const wasEmpty = !this.playback.isPlaying;
      this.playback.queueChunk(buf);
      if (wasEmpty) this.callbacks.onSpeakingStart?.();
      if (this._expectingAudioEnd && !this.playback.isPlaying) {
        this._expectingAudioEnd = false;
        this.callbacks.onSpeakingEnd?.();
      }
    });

    this.socket.on<ErrorEvent>('error', (e) => {
      this.callbacks.onError?.(e.code, e.message);
      console.error(`[VoiceSession] Server error (${e.code}): ${e.message}`);
    });

    // hello_ack carries the server-assigned session_id
    this.socket.on<HelloAckEvent>('hello_ack', (e) => {
      if (e?.session_id) this.callbacks.onSessionId?.(e.session_id);
    });
  }

  // ── Session lifecycle ─────────────────────────────────────────────────────

  /**
   * Connect to the voice server, request mic access, and start streaming.
   * Throws if mic permission is denied.
   */
  async start(): Promise<void> {
    if (this._running) return;
    this._running = true;
    this.energySmoother = 0;
    this._expectingAudioEnd = false;

    // Connect WebSocket (will auto-reconnect if dropped)
    this.socket.connect();

    // Start mic capture → stream PCM to server
    this.capture = new AudioCapture((pcm) => {
      // Local energy-based barge-in detection
      const int16 = new Int16Array(pcm);
      let sum = 0;
      for (let i = 0; i < int16.length; i++) {
        sum += (int16[i] / 32768) ** 2;
      }
      const rms = Math.sqrt(sum / int16.length);
      this.energySmoother = 0.8 * this.energySmoother + 0.2 * rms;

      if (this.playback.isPlaying && this.energySmoother > BARGE_IN_THRESHOLD) {
        // User started speaking while AI is playing — barge in
        this.playback.stopPlayback();
        this.socket.sendInterrupt();
      }

      // Always stream audio so server VAD+STT receives it
      this.socket.sendAudio(pcm);
    });

    await this.capture.start();
  }

  /** Cleanly tear down mic, playback, and WebSocket. */
  stop(): void {
    this._running = false;
    this.capture?.stop();
    this.capture = null;
    this.playback.stopPlayback();
    this.socket.disconnect();
  }

  /**
   * Hard barge-in from UI (e.g. button press).
   * Stops playback immediately and tells the server to cancel LLM/TTS.
   */
  interrupt(): void {
    this.playback.stopPlayback();
    this.socket.sendInterrupt();
  }

  /**
   * Send typed text instead of speaking.
   * Server skips STT and goes straight to router → LLM → TTS.
   */
  sendText(text: string): void {
    this.socket.sendText(text);
  }

  get isRunning(): boolean { return this._running; }
  get isServerConnected(): boolean { return this.socket.isConnected; }
}

