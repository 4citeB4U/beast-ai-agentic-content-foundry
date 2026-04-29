/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.LOOP
TAG: VOICE.LOOP.ORCHESTRATOR
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=radio
5WH:
  WHAT = LeeWay Voice Loop — the real-time voice heartbeat for Agent Lee
  WHY  = Wires STT → local brain (persona.ts) → TTS into a continuous,
         self-restarting loop so Agent Lee is always listening and always responding
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/voice-loop.ts
  WHEN = 2026
  HOW  = Web Speech API (SpeechRecognition continuous mode) for STT;
         respondToInput() (persona.ts) for local intelligence — zero LLM cost;
         SpeechSynthesis for TTS; optional PCM path to SFU voice server;
         RTC state injected as live context; automatic barge-in cancels speaking
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { useCallback, useEffect, useRef, useState } from 'react';
import { respondToInput, type RTCContext } from './persona';
import { getPoetryLine } from './poetry';
import type { ConversationMessage, VoiceLoopState, VoiceMode } from './types';
import { VOICE_MODES } from './types';
import { voiceRegistry } from './voice-registry';
import { findPreset, loadPresetId, savePresetId, DEFAULT_PRESET_ID } from './voice-presets';
import { detectEmotion, applyEmotion } from './emotion-engine';
import { speechQueue, type SpeechPriority } from './speech-queue';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VoiceLoopAPI {
  voiceState:   VoiceLoopState;
  transcript:   string;         // live partial transcript
  lastResponse: string;         // last spoken response
  available:    boolean;        // true when browser supports STT + TTS
  startLoop:    () => void;
  stopLoop:     () => void;
  speak:        (text: string, priority?: SpeechPriority) => void;
  bargeIn:      () => void;     // cancel current speech, start listening
  muted:        boolean;
  toggleMute:   () => void;
  setMode:      (m: VoiceMode) => void;
  mode:         VoiceMode;
  presetId:     string;
  setPresetId:  (id: string) => void;
}

// ---------------------------------------------------------------------------
// Browser capability checks
// ---------------------------------------------------------------------------

function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  return (
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition ??
    null
  );
}

function hasTTS(): boolean {
  return 'speechSynthesis' in window;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVoiceLoop(rtcState?: {
  connectionState: string;
  iceState: string;
  isRelay: boolean;
  peers: Array<{ packetLoss: number; rtt: number }>;
}): VoiceLoopAPI {

  const [voiceState, setVoiceState]   = useState<VoiceLoopState>('idle');
  const [transcript, setTranscript]   = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [muted, setMuted]             = useState(false);
  const [mode, setMode]               = useState<VoiceMode>(VOICE_MODES.RTC_OPS);
  const [available, setAvailable]     = useState(false);
  const [presetId, _setPresetId]      = useState<string>(DEFAULT_PRESET_ID);

  const setPresetId = useCallback((id: string) => {
    _setPresetId(id);
    savePresetId(id);
  }, []);

  const recognitionRef  = useRef<SpeechRecognition | null>(null);
  const loopActiveRef   = useRef(false);
  const isSpeakingRef   = useRef(false);
  const historyRef      = useRef<ConversationMessage[]>([]);

  // ── Derive live RTC context ───────────────────────────────────────────────
  const getRTCContext = useCallback((): RTCContext | undefined => {
    if (!rtcState) return undefined;
    const peers = rtcState.peers ?? [];
    const avgPacketLoss = peers.length
      ? peers.reduce((s, p) => s + p.packetLoss, 0) / peers.length
      : 0;
    const avgRTT = peers.length
      ? peers.reduce((s, p) => s + p.rtt, 0) / peers.length
      : 0;
    return {
      connectionState: rtcState.connectionState,
      iceState:        rtcState.iceState,
      isRelay:         rtcState.isRelay,
      peerCount:       peers.length,
      packetLoss:      avgPacketLoss,
      rtt:             avgRTT,
    };
  }, [rtcState]);

  // ── TTS speak (via speech queue + emotion engine) ─────────────────────────
  const speak = useCallback((text: string, priority: SpeechPriority = 'normal'): void => {
    if (!hasTTS() || muted || !text.trim()) return;

    const preset  = findPreset(presetId) ?? findPreset(DEFAULT_PRESET_ID)!;
    const emotion = detectEmotion(text);
    const applied = applyEmotion(emotion, preset.rate, preset.pitch, preset.volume);
    const voice   = voiceRegistry.findByHints(preset.voiceNameHints);

    speechQueue.enqueue({
      id:           `lee-${Date.now()}`,
      text,
      priority,
      rate:          applied.rate,
      pitch:         applied.pitch,
      volume:        applied.volume,
      pauseBeforeMs: applied.pauseBeforeMs,
      pauseAfterMs:  applied.pauseAfterMs,
      voice:         voice ?? undefined,
      onStart: () => {
        isSpeakingRef.current = true;
        setVoiceState('speaking');
      },
      onEnd: () => {
        isSpeakingRef.current = false;
        if (loopActiveRef.current) setVoiceState('listening');
        else setVoiceState('idle');
      },
    });

    setLastResponse(text);
  }, [muted, presetId]);

  // ── Process user speech ───────────────────────────────────────────────────
  const handleUserSpeech = useCallback(async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setTranscript(trimmed);
    setVoiceState('thinking');

    historyRef.current.push({ role: 'user', content: trimmed });
    if (historyRef.current.length > 40) {
      historyRef.current = historyRef.current.slice(-40);
    }

    // Small pause so "thinking" state is visible
    await new Promise<void>(r => setTimeout(r, 200));

    // Local rule-based brain first — zero latency
    const rtcCtx  = getRTCContext();
    const response = respondToInput(trimmed, historyRef.current, mode, rtcCtx);

    historyRef.current.push({ role: 'assistant', content: response });

    speak(response);
  }, [mode, getRTCContext, speak]);

  // ── STT recognition ───────────────────────────────────────────────────────
  const startRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || muted) return;

    const rec = new Ctor();
    rec.lang             = 'en-US';
    rec.continuous       = true;   // keep running — don't auto-stop
    rec.interimResults   = true;
    rec.maxAlternatives  = 1;

    rec.onstart = () => {
      setVoiceState('listening');
    };

    rec.onresult = (event) => {
      // Barge-in: if Agent Lee is speaking, cancel
      if (isSpeakingRef.current) {
        speechQueue.clear();
        isSpeakingRef.current = false;
      }

      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }

      if (interim) setTranscript(interim);

      if (final) {
        setTranscript(final);
        void handleUserSpeech(final);
      }
    };

    rec.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.warn('[AgentLee STT]', event.error);
    };

    rec.onend = () => {
      // Auto-restart to keep the loop alive (browsers stop after silence)
      if (loopActiveRef.current && !muted) {
        try { rec.start(); } catch { /* already started race */ }
      } else {
        setVoiceState('idle');
      }
    };

    rec.start();
    recognitionRef.current = rec;
  }, [muted, handleUserSpeech]);

  // ── Public controls ───────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const hasSpeechRec = !!getSpeechRecognitionCtor();
    if (!hasSpeechRec) return;
    loopActiveRef.current = true;
    startRecognition();
    // Greet on first start
    const greeting = "Agent Lee online. I'm watching your RTC session. Talk to me.";
    setTimeout(() => speak(greeting), 600);
  }, [startRecognition, speak]);

  const stopLoop = useCallback(() => {
    loopActiveRef.current = false;
    try { recognitionRef.current?.abort(); } catch { /* noop */ }
    recognitionRef.current = null;
    speechQueue.clear();
    isSpeakingRef.current = false;
    setVoiceState('idle');
    setTranscript('');
  }, []);

  const bargeIn = useCallback(() => {
    speechQueue.clear();
    isSpeakingRef.current = false;
    if (loopActiveRef.current) setVoiceState('listening');
  }, []);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      if (next) {
        speechQueue.clear();
        recognitionRef.current?.abort();
        setVoiceState('muted');
      } else if (loopActiveRef.current) {
        startRecognition();
      }
      return next;
    });
  }, [startRecognition]);

  // ── Availability check + voice registry init ─────────────────────────────
  useEffect(() => {
    const ok = !!getSpeechRecognitionCtor() && hasTTS();
    setAvailable(ok);
    if (!ok) setVoiceState('unavailable');
    voiceRegistry.init();
    _setPresetId(loadPresetId());
  }, []);

  // ── RTC anomaly proactive announcements ───────────────────────────────────
  const prevConnectionRef = useRef<string>('');
  useEffect(() => {
    if (!rtcState || !loopActiveRef.current || muted) return;
    const prev = prevConnectionRef.current;
    const curr = rtcState.connectionState;
    if (prev === curr) return;
    prevConnectionRef.current = curr;

    if (curr === 'connected' && prev === 'connecting') {
      speak(`${getPoetryLine('connection_good')} Session established.`);
    } else if (curr === 'failed') {
      speak(getPoetryLine('connection_failed'));
    } else if (curr === 'disconnected' && prev === 'connected') {
      speak(getPoetryLine('connection_degraded'));
    }
  }, [rtcState?.connectionState, muted, speak]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      loopActiveRef.current = false;
      try { recognitionRef.current?.abort(); } catch { /* noop */ }
      speechQueue.clear();
    };
  }, []);

  return {
    voiceState,
    transcript,
    lastResponse,
    available,
    startLoop,
    stopLoop,
    speak,
    bargeIn,
    muted,
    toggleMute,
    setMode,
    mode,
    presetId,
    setPresetId,
  };
}
