/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.SERVICE.VOICE
TAG: AI.ORCHESTRATION.SERVICE.VOICE.BRIDGE

COLOR_ONION_HEX:
NEON=#EC4899
FLUO=#F472B6
PASTEL=#FBCFE8

ICON_ASCII:
family=lucide
glyph=volume-2

5WH:
WHAT = Frontend voice bridge — calls voice-agent-mcp /speak REST endpoint and plays audio
WHY = Connects frontend (Echo.ts) to voice-agent-mcp TTS pipeline; previously no frontend path existed
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/VoiceService.ts
WHEN = 2026
HOW = Fetch to local voice-agent-mcp /speak, decode base64 MP3, play via Web Audio API / HTMLAudioElement

AGENTS:
ASSESS
AUDIT
ECHO

LICENSE:
MIT
*/

// core/VoiceService.ts
// VOICE PRIORITY CHAIN:
//   1. leeway Live (bidirectional WebSocket audio — first line)
//   2. voice-agent-mcp Edge-TTS REST /speak (offline/fallback)
//   3. Browser Web Speech API (last-resort fallback)

import { leewayVoiceClient, type LeewayVoiceSessionConfig } from './LeewayVoiceClient';

const VOICE_AGENT_URL = import.meta.env.VITE_VOICE_AGENT_URL ?? 'http://127.0.0.1:3010';
const leeway_LIVE_API_KEY = '' ?? '';

export interface SpeakOptions {
  text: string;
  voiceId?: string;
  speed?: number;
  language?: string;
  systemPrompt?: string;
  /** Force specific tier instead of trying in order */
  forceTier?: 'live' | 'edge-tts' | 'browser';
}

export type VoiceTier = 'live' | 'edge-tts' | 'browser';

class VoiceServiceClass {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private activeTier: VoiceTier = 'live';
  private liveSessionActive = false;

  private getAudioContext(): AudioContext {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  get currentTier(): VoiceTier {
    return this.activeTier;
  }

  /** Stop any currently playing audio across all tiers. */
  stop(): void {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
    window.speechSynthesis?.cancel();
    if (this.liveSessionActive) {
      leewayVoiceClient.disconnect();
      this.liveSessionActive = false;
    }
  }

  /**
   * Speak text using the priority chain:
   *   Tier 1: leeway Live (streaming audio back from leeway)
   *   Tier 2: voice-agent-mcp Edge-TTS /speak REST endpoint
   *   Tier 3: Browser SpeechSynthesis
   */
  async speak(opts: SpeakOptions): Promise<void> {
    this.stop();

    if (opts.forceTier === 'live') return this.speakViaLive(opts);
    if (opts.forceTier === 'edge-tts') return this.speakViaEdgeTTS(opts);
    if (opts.forceTier === 'browser') { this.browserSpeak(opts.text); return; }

    // --- Tier 1: leeway Live ---
    if (leeway_LIVE_API_KEY) {
      const success = await this.speakViaLive(opts).then(() => true).catch(() => false);
      if (success) { this.activeTier = 'live'; return; }
    }

    // --- Tier 2: voice-agent-mcp Edge-TTS ---
    const edgeSuccess = await this.speakViaEdgeTTS(opts).then(() => true).catch(() => false);
    if (edgeSuccess) { this.activeTier = 'edge-tts'; return; }

    // --- Tier 3: Browser SpeechSynthesis ---
    this.activeTier = 'browser';
    this.browserSpeak(opts.text);
  }

  // ── Tier 1: leeway Live text→audio ─────────────────────────
  private async speakViaLive(opts: SpeakOptions): Promise<void> {
    if (!leeway_LIVE_API_KEY) throw new Error('No leeway API key for Live');

    return new Promise<void>((resolve, reject) => {
      const audioChunks: Uint8Array[] = [];

      const config: LeewayVoiceSessionConfig = {
        model: 'gemma4:e2b',
        systemPrompt: opts.systemPrompt,
        onMessage: (msg) => {
          if (msg.audioBase64) {
            const bin = atob(msg.audioBase64);
            const bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
            audioChunks.push(bytes);
          }
          if (msg.text) {
            // Text response received — signal done playing text
            resolve();
          }
        },
        onError: (err) => reject(err),
        onClose: () => {
          this.liveSessionActive = false;
          if (audioChunks.length > 0) {
            this.playPCMChunks(audioChunks).then(resolve).catch(reject);
          } else {
            resolve();
          }
        },
      };

      leewayVoiceClient.connect(leeway_LIVE_API_KEY, config)
        .then(() => {
          this.liveSessionActive = true;
          leewayVoiceClient.sendText(opts.text);
          // Disconnect after 8s to flush audio
          setTimeout(() => { if (leewayVoiceClient.isConnected) leewayVoiceClient.disconnect(); }, 8000);
        })
        .catch(reject);
    });
  }

  private async playPCMChunks(chunks: Uint8Array[]): Promise<void> {
    const total = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { merged.set(c, offset); offset += c.length; }
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const audioBuffer = await ctx.decodeAudioData(merged.buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    this.currentSource = source;
    return new Promise(resolve => { source.onended = () => resolve(); });
  }

  // ── Tier 2: voice-agent-mcp Edge-TTS ───────────────────────
  private async speakViaEdgeTTS(opts: SpeakOptions): Promise<void> {
    const res = await fetch(`${VOICE_AGENT_URL}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: opts.text,
        voice_id: opts.voiceId,
        speed: opts.speed ?? 1.0,
        language: opts.language,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Edge-TTS agent error: ${res.status}`);
    const data = await res.json() as { audio_base64: string | null; text_fallback?: string };
    if (!data.audio_base64) throw new Error('Edge-TTS returned no audio');
    await this.playBase64Audio(data.audio_base64);
  }

  private async playBase64Audio(base64: string): Promise<void> {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') await ctx.resume();
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start(0);
    this.currentSource = source;
    return new Promise(resolve => { source.onended = () => resolve(); });
  }

  // ── Tier 3: Browser SpeechSynthesis ────────────────────────
  private browserSpeak(text: string): void {
    if (!window.speechSynthesis) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Agent Lee Persona: Deep, calm, professional
    utterance.pitch = 0.85; // Lower pitch for "Deep" feel
    utterance.rate = 0.95;  // Slightly slower for "Calm/Deliberate" feel
    utterance.volume = 1.0;

    // Try to find a premium/natural voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      // Priority: Natural/premium voices that sound deep
      const premiumVoice = voices.find(v => 
        (v.name.includes('Natural') || v.name.includes('Premium')) && 
        v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }
    }

    // Handle events for UI synchronization
    utterance.onstart = () => {
      eventBus.emit('tts:speaking' as any, { text, prosody: { pace: 'moderate', pitch: 'low', emotion: 'calm' } });
    };
    utterance.onend = () => {
      eventBus.emit('tts:done' as any, { durationMs: 0 });
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const VoiceService = new VoiceServiceClass();

