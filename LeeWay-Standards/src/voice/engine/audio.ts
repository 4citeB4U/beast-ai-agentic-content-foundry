/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.AUDIO
TAG: VOICE.AUDIO.CAPTURE_PLAYBACK
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=audio-lines
5WH:
  WHAT = Low-level audio capture (PCM worklet mic) and gapless PCM playback
  WHY  = Provides raw audio I/O for the voice loop — used when routing to the
         voice server (ws path). Web Speech API path does not use this module.
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/audio.ts (adapted from agentleevoice AudioCapture/AudioPlayback)
  WHEN = 2026
  HOW  = getUserMedia → AudioWorklet PCM capture at 16 kHz;
         PCM chunks queued via AudioContext for gapless 22050 Hz playback
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


export type AudioChunkCallback = (chunk: ArrayBuffer) => void;

const CAPTURE_SAMPLE_RATE  = 16_000;  // Must match server VAD/STT
const PLAYBACK_SAMPLE_RATE = 22_050;  // Must match server TTS

// Inline AudioWorklet processor (runs in worklet thread, no imports allowed)
const WORKLET_SRC = /* js */ `
class PCMCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._sampleCount = 0;
    this._chunkSize = 512; // ≈32 ms at 16 kHz
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    for (let i = 0; i < ch.length; i++) {
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

// ── Capture ───────────────────────────────────────────────────────────────────

export class AudioCapture {
  private _ctx:     AudioContext | null = null;
  private _source:  MediaStreamAudioSourceNode | null = null;
  private _worklet: AudioWorkletNode | null = null;
  private _stream:  MediaStream | null = null;
  private _onChunk: AudioChunkCallback;

  constructor(onChunk: AudioChunkCallback) {
    this._onChunk = onChunk;
  }

  async start(): Promise<void> {
    this._stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate:        CAPTURE_SAMPLE_RATE,
        channelCount:      1,
        echoCancellation:  true,
        noiseSuppression:  true,
        autoGainControl:   true,
      },
    });

    this._ctx = new AudioContext({ sampleRate: CAPTURE_SAMPLE_RATE });

    const blob = new Blob([WORKLET_SRC], { type: 'application/javascript' });
    const url  = URL.createObjectURL(blob);
    await this._ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this._source  = this._ctx.createMediaStreamSource(this._stream);
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
    this._stream?.getTracks().forEach(t => t.stop());
    this._ctx?.close();
    this._ctx    = null;
    this._worklet = null;
    this._source  = null;
    this._stream  = null;
  }

  /** Returns approximate RMS energy level 0-1 for UI visualization. */
  getLevel(): number {
    return 0; // Expand with AnalyserNode if VU meter is needed
  }
}

// ── Playback ──────────────────────────────────────────────────────────────────

export class AudioPlayback {
  private _ctx:           AudioContext;
  private _nextStartTime  = 0;
  private _sources:       AudioBufferSourceNode[] = [];
  private _sampleRate:    number;
  private _playing        = false;

  constructor(sampleRate = PLAYBACK_SAMPLE_RATE) {
    this._sampleRate = sampleRate;
    this._ctx = new AudioContext({ sampleRate });
  }

  /** Queue a PCM chunk (16-bit LE bytes) for gapless playback. */
  queueChunk(pcmBuffer: ArrayBuffer): void {
    const int16   = new Int16Array(pcmBuffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = this._ctx.createBuffer(1, float32.length, this._sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = this._ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this._ctx.destination);

    const now = this._ctx.currentTime;
    if (this._nextStartTime < now) this._nextStartTime = now;

    source.start(this._nextStartTime);
    this._nextStartTime += audioBuffer.duration;

    source.onended = () => {
      this._sources = this._sources.filter(s => s !== source);
      if (this._sources.length === 0) this._playing = false;
    };

    this._sources.push(source);
    this._playing = true;
  }

  /** Cancel all queued audio immediately (barge-in). */
  stopPlayback(): void {
    for (const s of this._sources) {
      try { s.stop(); } catch { /* already ended */ }
    }
    this._sources       = [];
    this._nextStartTime = 0;
    this._playing       = false;
  }

  get isPlaying(): boolean {
    return this._playing;
  }
}

// ── Local energy RMS (for barge-in threshold detection) ───────────────────────

export function computeRMS(pcm: ArrayBuffer): number {
  const int16 = new Int16Array(pcm);
  let sum = 0;
  for (let i = 0; i < int16.length; i++) {
    sum += (int16[i] / 32768) ** 2;
  }
  return Math.sqrt(sum / int16.length);
}
