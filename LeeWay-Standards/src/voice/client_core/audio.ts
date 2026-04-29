/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.SDK.AUDIO.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = audio module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = voice\client_core\audio.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/**
 * audio.ts – Web Audio API capture and playback for Agent Lee.
 *
 * Capture:  getUserMedia → AudioWorklet → PCM 16-bit LE chunks → callback
 * Playback: PCM chunks queued and played back in real-time via AudioContext
 * Barge-in: stopPlayback() cancels all pending audio immediately
 */

export type AudioChunkCallback = (chunk: ArrayBuffer) => void;

const CAPTURE_SAMPLE_RATE = 16000; // Must match server VAD/STT
const PLAYBACK_SAMPLE_RATE = 22050; // Must match server TTS

// Inline AudioWorklet processor source
const WORKLET_SRC = /* js */ `
class PCMCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._sampleCount = 0;
    // Send 512 samples per chunk (≈32 ms at 16 kHz)
    this._chunkSize = 512;
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    for (let i = 0; i < ch.length; i++) {
      // Convert float32 → int16
      const s = Math.max(-1, Math.min(1, ch[i]));
      const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
      this._buf.push(int16);
      this._sampleCount++;
      if (this._sampleCount >= this._chunkSize) {
        const ab = new Int16Array(this._buf).buffer;
        this.port.postMessage({ pcm: ab }, [ab]);
        this._buf = [];
        this._sampleCount = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PCMCapture);
`;

export class AudioCapture {
  private _ctx: AudioContext | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private _worklet: AudioWorkletNode | null = null;
  private _stream: MediaStream | null = null;
  private _onChunk: AudioChunkCallback;

  constructor(onChunk: AudioChunkCallback) {
    this._onChunk = onChunk;
  }

  async start(): Promise<void> {
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: CAPTURE_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this._ctx = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });

    const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    await this._ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this._source = this._ctx.createMediaStreamSource(this._stream);
    this._worklet = new AudioWorkletNode(this._ctx, 'pcm-capture');
    this._worklet.port.onmessage = (e) => {
      this._onChunk(e.data.pcm as ArrayBuffer);
    };
    this._source.connect(this._worklet);
    this._worklet.connect(this._ctx.destination);
  }

  stop(): void {
    this._worklet?.disconnect();
    this._source?.disconnect();
    this._stream?.getTracks().forEach((t) => t.stop());
    this._ctx?.close();
    this._ctx = null;
    this._worklet = null;
    this._source = null;
    this._stream = null;
  }

  /** Return current microphone input level (0-1) for visualisation. */
  getLevel(): number {
    if (!this._ctx || !this._source) return 0;
    // Approximated via worklet; real impl uses AnalyserNode
    return 0;
  }
}

// ── Playback ──────────────────────────────────────────────────────────────────

export class AudioPlayback {
  private _ctx: AudioContext;
  private _nextStartTime = 0;
  private _sources: AudioBufferSourceNode[] = [];
  private _sampleRate: number;

  constructor(sampleRate = PLAYBACK_SAMPLE_RATE) {
    this._sampleRate = sampleRate;
    this._ctx = new AudioContext({ sampleRate });
  }

  /** Queue a PCM chunk (16-bit LE bytes) for gapless playback. */
  queueChunk(pcmBuffer: ArrayBuffer): void {
    const int16 = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = this._ctx.createBuffer(1, float32.length, this._sampleRate);
    audioBuffer.copyToChannel(float32, 0);

    const source = this._ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this._ctx.destination);

    const now = this._ctx.currentTime;
    const startAt = Math.max(now, this._nextStartTime);
    source.start(startAt);
    this._nextStartTime = startAt + audioBuffer.duration;

    source.onended = () => {
      const idx = this._sources.indexOf(source);
      if (idx !== -1) this._sources.splice(idx, 1);
    };
    this._sources.push(source);
  }

  /** Stop all playback immediately (barge-in). */
  stopPlayback(): void {
    const now = this._ctx.currentTime;
    for (const src of this._sources) {
      try {
        src.stop(now);
      } catch {
        // already stopped
      }
    }
    this._sources = [];
    this._nextStartTime = this._ctx.currentTime;
  }

  /** True if audio is currently scheduled to play. */
  get isPlaying(): boolean {
    return this._sources.length > 0;
  }

  close(): void {
    this.stopPlayback();
    this._ctx.close();
  }
}

// ── Visualiser ────────────────────────────────────────────────────────────────

export class VUMeter {
  private _canvas: HTMLCanvasElement;
  private _ctx2d: CanvasRenderingContext2D;
  private _level = 0;
  private _raf = 0;

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._ctx2d = canvas.getContext('2d')!;
    this._draw();
  }

  setLevel(level: number): void {
    this._level = Math.max(0, Math.min(1, level));
  }

  private _draw(): void {
    const { width, height } = this._canvas;
    const ctx = this._ctx2d;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Bar
    const barW = Math.floor(this._level * width);
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, '#4CAF50');
    gradient.addColorStop(0.7, '#FFC107');
    gradient.addColorStop(1, '#F44336');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, barW, height);

    this._raf = requestAnimationFrame(() => this._draw());
  }

  destroy(): void {
    cancelAnimationFrame(this._raf);
  }
}
