/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE
TAG: CORE.SDK.UNIFIEDVOICESESSION.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = UnifiedVoiceSession module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = core\UnifiedVoiceSession.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

/**
 * UNIFIED VOICE SESSION
 * =====================
 * 
 * Single source of truth for microphone lifecycle and audio processing.
 * 
 * BEFORE: VoiceService + LiveConductorAgent + AgentleeMic (3 handlers)
 * AFTER: VoiceSession (1 handler)
 * 
 * Responsibilities:
 * 1. Manage mic lifecycle (request → capture → stop)
 * 2. Stream audio PCM to server
 * 3. Detect speech start/end (VAD)
 * 4. Handle turn-taking
 * 5. Publish to PerceptionBus
 * 6. Support interruption (barge-in)
 * 
 * NO state duplication.
 * NO conflicting callbacks.
 * SINGLE event source.
 */

import { PerceptionBus, PerceptionEvent } from './PerceptionBus';
import { eventBus } from './EventBus';

/**
 * VOICE STATE MACHINE
 */
export enum VoiceState {
  IDLE = 'idle',              // No voice session
  REQUESTING_PERMISSION = 'requesting_permission', // Waiting for mic permission
  READY = 'ready',            // Mic ready, not capturing
  LISTENING = 'listening',    // Capturing audio, waiting for speech
  SPEAKING = 'speaking',      // Agent speaking, mic open for interruption
  PROCESSING = 'processing',  // STT/inference in flight
  ERROR = 'error'             // Error state
}

/**
 * VOICE STATISTICS
 */
export interface VoiceStats {
  sessionsStarted: number;
  totalListeningTime: number;
  totalSpeakingTime: number;
  interruptionsHandled: number;
  lastTranscriptTime: number;
  averageTranscriptLength: number;
}

/**
 * UNIFIED VOICE SESSION
 */
export class VoiceSession {
  private static instance: VoiceSession;

  // Lifecycle
  private state: VoiceState = VoiceState.IDLE;
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private processor: ScriptProcessorNode | null = null;

  // Server connection
  private wsConnection: WebSocket | null = null;
  private serverUrl: string;

  // Perception bus
  private perceptionBus: PerceptionBus;

  // VAD (Voice Activity Detection)
  private energyThreshold = 0.012;
  private silenceCount = 0;
  private silenceThreshold = 30; // frames of silence = stop listening

  // Statistics
  private stats: VoiceStats = {
    sessionsStarted: 0,
    totalListeningTime: 0,
    totalSpeakingTime: 0,
    interruptionsHandled: 0,
    lastTranscriptTime: 0,
    averageTranscriptLength: 0
  };

  // Current session data
  private currentTranscript = '';
  private sessionStartTime = 0;
  private consecutiveSilenceFrames = 0;

  private constructor() {
    this.perceptionBus = PerceptionBus.getInstance();
    const processEnv = typeof globalThis !== 'undefined'
      ? (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env
      : undefined;

    this.serverUrl = import.meta.env.VITE_VOICE_WS_URL || processEnv?.VITE_VOICE_WS_URL || 'ws://localhost:8001/voice';
  }

  /**
   * GET SINGLETON
   */
  static getInstance(): VoiceSession {
    if (!VoiceSession.instance) {
      VoiceSession.instance = new VoiceSession();
    }
    return VoiceSession.instance;
  }

  /**
   * START VOICE SESSION
   * 
   * Flow:
   * 1. Request microphone permission (async)
   * 2. Connect to server (WebSocket)
   * 3. Start capturing audio
   * 4. Begin VAD monitoring
   * 5. Publish 'listening' state
   */
  async start(): Promise<void> {
    if (this.state !== VoiceState.IDLE && this.state !== VoiceState.ERROR) {
      console.warn('[VoiceSession] Already started, state:', this.state);
      return;
    }

    console.log('[VoiceSession] Starting voice session...');
    this.setState(VoiceState.REQUESTING_PERMISSION);

    try {
      // 1. REQUEST MIC PERMISSION (async, non-blocking to app)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false // We manage gain ourselves
        }
      });

      // 2. SETUP AUDIO CONTEXT
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 3. SETUP ANALYSER FOR VAD
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      source.connect(this.analyser);

      // 4. SETUP PROCESSOR (web audio API for frame-by-frame processing)
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

      this.processor.onaudioprocess = (e) => {
        this.onAudioFrame(e.inputBuffer);
      };

      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // 5. CONNECT TO SERVER
      await this.connectToServer();

      this.setState(VoiceState.LISTENING);
      this.sessionStartTime = Date.now();
      this.stats.sessionsStarted++;

      // 6. PUBLISH 'LISTENING' STATE TO PERCEPTION BUS
      await this.publishPerceptionEvent({
        state: 'listening',
        transcript: '',
        isFinal: false,
        audio: {
          format: 'pcm16',
          sampleRate: this.audioContext?.sampleRate || 48000,
          duration: 0
        }
      });

    } catch (error) {
      console.error('[VoiceSession] Start failed:', error);
      this.setState(VoiceState.ERROR);
      eventBus.emit('voice:error' as any, {
        error: String(error),
        context: 'start'
      });
      throw error;
    }
  }

  /**
   * STOP VOICE SESSION
   */
  async stop(): Promise<void> {
    console.log('[VoiceSession] Stopping voice session');

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close();
      this.audioContext = null;
    }

    await this.disconnectFromServer();

    this.setState(VoiceState.IDLE);
    this.currentTranscript = '';
  }

  /**
   * INTERRUPT (for barge-in)
   * 
   * Called when user speaks while agent speaking.
   * Stops TTS, signals orchestration pipeline.
   */
  async interrupt(): Promise<void> {
    console.log('[VoiceSession] User interrupted agent (barge-in)');

    this.stats.interruptionsHandled++;

    // Signal orchestration pipeline
    eventBus.emit('voice:interrupt' as any, {
      timestamp: Date.now()
    });

    // Reset silence counter (user is speaking, not silence)
    this.consecutiveSilenceFrames = 0;

    // Publish interruption to perception bus
    await this.perceptionBus.publish({
      id: `interrupt_${Date.now()}`,
      type: 'voice',
      source: 'VoiceSession',
      timestamp: Date.now(),
      payload: {
        kind: 'voice',
        state: 'processing',
        metadata: {
          event: 'interruption'
        }
      }
    });
  }

  /**
   * HANDLE AUDIO FRAME (Web Audio API callback)
   * 
   * Called ~40-100 times per second (frame rate depends on buffer size).
   * 1. Calculate energy (RMS)
   * 2. Detect speech via VAD threshold
   * 3. Send to server
   * 4. Track silence
   */
  private async onAudioFrame(buffer: AudioBuffer): Promise<void> {
    if (!this.audioContext) return;

    const rawData = buffer.getChannelData(0);

    // 1. CALCULATE ENERGY
    let sum = 0;
    for (let i = 0; i < rawData.length; i++) {
      sum += rawData[i] * rawData[i];
    }
    const rms = Math.sqrt(sum / rawData.length);

    // 2. VAD DECISION
    const isSpeech = rms > this.energyThreshold;

    if (isSpeech) {
      this.consecutiveSilenceFrames = 0;
    } else {
      this.consecutiveSilenceFrames++;
    }

    // 3. SEND TO SERVER (for STT)
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      const pcm16 = this.floatTo16BitPCM(rawData);
      this.wsConnection.send(pcm16 as any);
    }

    // 4. END-OF-SPEECH DETECTION
    if (
      this.consecutiveSilenceFrames > this.silenceThreshold &&
      this.state === VoiceState.LISTENING
    ) {
      console.log('[VoiceSession] Silence detected, sending final transcript');
      // Signal to server: end of sentence
      if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
        this.wsConnection.send(JSON.stringify({ type: 'stop_listening' }));
      }
    }
  }

  /**
   * CONNECT TO SERVER
   */
  private async connectToServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      try {
        this.wsConnection = new WebSocket(this.serverUrl);

        this.wsConnection.onopen = () => {
          clearTimeout(timeout);
          console.log('[VoiceSession] Connected to voice server');
          resolve();
        };

        this.wsConnection.onmessage = async (event) => {
          await this.onServerMessage(event.data);
        };

        this.wsConnection.onerror = (error) => {
          clearTimeout(timeout);
          console.error('[VoiceSession] WebSocket error:', error);
          reject(error);
        };

        this.wsConnection.onclose = () => {
          console.log('[VoiceSession] Disconnected from server');
          this.wsConnection = null;
        };

      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * DISCONNECT FROM SERVER
   */
  private async disconnectFromServer(): Promise<void> {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }

  /**
   * HANDLE SERVER MESSAGE
   * 
   * Expected messages:
   * - { type: 'partial', text: 'hello...' }
   * - { type: 'final', text: 'hello world' }
   * - { type: 'done' }
   */
  private async onServerMessage(dataOrText: string | ArrayBuffer): Promise<void> {
    if (typeof dataOrText !== 'string') return;

    try {
      const message = JSON.parse(dataOrText);

      if (message.type === 'partial') {
        // Partial transcript (don't publish as final)
        this.currentTranscript = message.text;
        eventBus.emit('voice:partial' as any, {
          transcript: message.text
        });
      } else if (message.type === 'final') {
        // FINAL TRANSCRIPT - PUBLISH TO PERCEPTION BUS
        this.currentTranscript = message.text;
        this.stats.lastTranscriptTime = Date.now();

        await this.publishPerceptionEvent({
          state: 'processing',
          transcript: message.text,
          isFinal: true,
          confidence: message.confidence || 0.95,
          audio: {
            format: 'pcm16',
            sampleRate: this.audioContext?.sampleRate || 48000,
            duration: Date.now() - this.sessionStartTime
          }
        });

      } else if (message.type === 'done') {
        // Server finished processing
        console.log('[VoiceSession] Server processing complete');
        this.setState(VoiceState.READY);
      }

    } catch (error) {
      console.error('[VoiceSession] Error parsing server message:', error);
    }
  }

  /**
   * PUBLISH TO PERCEPTION BUS
   * 
   * This is the single point where voice enters the unified system.
   */
  private async publishPerceptionEvent(payload: any): Promise<void> {
    try {
      await this.perceptionBus.publish({
        id: `voice_${Date.now()}`,
        type: 'voice',
        source: 'VoiceSession',
        timestamp: Date.now(),
        latency: {
          captured: this.sessionStartTime
        },
        payload: {
          kind: 'voice',
          ...payload,
          originalLanguage: 'en-US'
        }
      });
    } catch (error) {
      console.error('[VoiceSession] Failed to publish perception event:', error);
    }
  }

  /**
   * STATE SETTER
   */
  private setState(newState: VoiceState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    console.log(`[VoiceSession] State: ${oldState} → ${newState}`);

    eventBus.emit('voice:state' as any, {
      state: newState,
      previousState: oldState,
      timestamp: Date.now()
    });
  }

  /**
   * GET CURRENT STATE
   */
  getState(): VoiceState {
    return this.state;
  }

  /**
   * GET STATS
   */
  getStats(): VoiceStats {
    return { ...this.stats };
  }

  /**
   * UTILITY: Convert Float32Array to 16-bit PCM
   */
  private floatTo16BitPCM(float32Array: Float32Array): Int16Array {
    const length = float32Array.length;
    const int16 = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    return int16;
  }
}

// Export singleton
export const voiceSession = VoiceSession.getInstance();
