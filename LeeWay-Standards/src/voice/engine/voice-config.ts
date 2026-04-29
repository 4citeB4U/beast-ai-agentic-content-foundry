/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

TAG: VOICE.CONFIG.PERSISTENCE
REGION: 🎤 VOICE
PURPOSE: Persistent storage and retrieval of user voice preferences
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/**
 * VoiceConfig — User's preferred voice settings
 * Saved to localStorage under key "leeway_voice_custom"
 */
export interface VoiceConfig {
  voiceName: string;        // Name of SpeechSynthesisVoice
  rate: number;             // 0.1–10, typically 0.5–2
  pitch: number;            // 0–2, typically 0.5–1.5
  volume: number;           // 0–1
}

const VOICE_CONFIG_KEY = 'leeway_voice_custom';

const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceName: '',            // Will resolve to first available voice
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
};

/**
 * Load voice configuration from localStorage
 * Returns default config if not set or invalid
 */
export function loadVoiceConfig(): VoiceConfig {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...DEFAULT_VOICE_CONFIG };
  }

  try {
    const stored = window.localStorage.getItem(VOICE_CONFIG_KEY);
    if (!stored) {
      return { ...DEFAULT_VOICE_CONFIG };
    }

    const parsed = JSON.parse(stored) as VoiceConfig;

    // Validate
    if (
      typeof parsed.voiceName !== 'string' ||
      typeof parsed.rate !== 'number' ||
      typeof parsed.pitch !== 'number' ||
      typeof parsed.volume !== 'number'
    ) {
      console.warn('Invalid voice config in localStorage, using default');
      return { ...DEFAULT_VOICE_CONFIG };
    }

    return {
      voiceName: parsed.voiceName,
      rate: Math.max(0.1, Math.min(10, parsed.rate)),
      pitch: Math.max(0, Math.min(2, parsed.pitch)),
      volume: Math.max(0, Math.min(1, parsed.volume)),
    };
  } catch (err) {
    console.error('Failed to parse voice config:', err);
    return { ...DEFAULT_VOICE_CONFIG };
  }
}

/**
 * Save voice configuration to localStorage
 */
export function saveVoiceConfig(config: VoiceConfig): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(VOICE_CONFIG_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save voice config:', err);
  }
}

/**
 * Clear voice configuration from localStorage
 */
export function clearVoiceConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(VOICE_CONFIG_KEY);
  } catch (err) {
    console.error('Failed to clear voice config:', err);
  }
}

/**
 * Update specific voice config field
 */
export function updateVoiceConfig(partial: Partial<VoiceConfig>): VoiceConfig {
  const current = loadVoiceConfig();
  const updated = { ...current, ...partial };
  saveVoiceConfig(updated);
  return updated;
}
