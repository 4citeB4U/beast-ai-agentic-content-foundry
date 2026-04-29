/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: VOICE.OUTPUT.ADAPTER
REGION: 🎤 VOICE
PURPOSE: Speak utterances using saved voice configuration
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { loadVoiceConfig, type VoiceConfig } from './voice-config';
import { speechQueue, type SpeechItem } from './speech-queue';

/**
 * Resolves a voice name against available browser voices
 * Returns the best matching SpeechSynthesisVoice or first available English voice
 */
export function resolveVoice(voiceName: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();

  if (!voiceName) {
    return voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
  }

  const exact = voices.find(v => v.name === voiceName);
  if (exact) return exact;

  const partial = voices.find(v => v.name.includes(voiceName));
  if (partial) return partial;

  return voices.find(v => v.lang === 'en-US') || voices.find(v => v.lang.startsWith('en'));
}

/**
 * Speak text using the saved voice configuration
 * Enqueues into the speechQueue with appropriate priority
 */
export function speakWithSavedVoice(
  text: string,
  priority: 'high' | 'normal' | 'low' = 'normal',
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!text || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis unavailable or no text provided');
    return;
  }

  const config = loadVoiceConfig();
  const voice = resolveVoice(config.voiceName);

  const item: SpeechItem = {
    id: `utterance-${Date.now()}-${Math.random()}`,
    text,
    priority,
    rate: config.rate,
    pitch: config.pitch,
    volume: config.volume,
    voice,
    pauseBeforeMs: 0,
    pauseAfterMs: 100,
    onStart,
    onEnd,
  };

  speechQueue.enqueue(item);
}

/**
 * Speak text directly (without queuing) using saved voice config
 * For interrupting with high-priority responses
 */
export function speakDirectWithSavedVoice(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (!text || !('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis unavailable or no text provided');
    return;
  }

  window.speechSynthesis.cancel();

  const config = loadVoiceConfig();
  const voice = resolveVoice(config.voiceName);

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice ?? null;
  utterance.rate = config.rate;
  utterance.pitch = config.pitch;
  utterance.volume = config.volume;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Cancel any ongoing speech
 */
export function cancelSpeech(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Get the currently configured voice or a fallback
 */
export function getCurrentVoice(): SpeechSynthesisVoice | undefined {
  const config = loadVoiceConfig();
  return resolveVoice(config.voiceName);
}

/**
 * Get the voice display name (for UI)
 */
export function getVoiceDisplayName(): string {
  const voice = getCurrentVoice();
  return voice?.name || 'System Default';
}
