/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.PRESETS
TAG: VOICE.PRESETS.PROFILES
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=sliders-horizontal
5WH:
  WHAT = LeeWay Voice Presets — 3M + 3F pinnable voice profiles
  WHY  = Lets users pin a preferred agent voice; stores only name+rate/pitch/volume —
         no bundled audio, no vendor TTS API — pure browser SpeechSynthesis
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/voice-presets.ts
  WHEN = 2026
  HOW  = Static preset table; voiceRegistry resolves the best matching
         SpeechSynthesisVoice at runtime from each preset's voiceNameHints array
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// ─── Types ─────────────────────────────────────────────────────────────────────
export interface VoicePreset {
  /** Short stable ID — used in localStorage / user settings. */
  id: string;
  label: string;
  gender: 'male' | 'female';
  /**
   * Ordered list of voice name substrings to try when resolving a voice.
   * The registry picks the first available match on the current device.
   */
  voiceNameHints: string[];
  /** Base SpeechSynthesisUtterance parameters (emotion engine multiplies these). */
  rate: number;
  pitch: number;
  volume: number;
  /** High-Definition flag for premium playback. */
  hd: boolean;
  /** Supported language codes (ISO 639-1) */
  languages: string[];
  description: string;
}

// ─── Preset table ─────────────────────────────────────────────────────────────
/**
 * 3 male + 3 female presets.
 * Values are chosen to be comfortable on both desktop speakers and headsets.
 */
export const VOICE_PRESETS: readonly VoicePreset[] = [
  // ── Male presets — prefer Microsoft Neural, fall back to standard ────────────
  {
    id: 'M1',
    label: 'Agent Lee — Premium HD',
    gender: 'male',
    voiceNameHints: [
      'Microsoft Guy Online (Natural)',
      'Microsoft Eric Online (Natural)',
      'Microsoft Roger Online (Natural)',
      'Microsoft Brian Online (Natural)',
      'Daniel', 'David', 'James',
    ],
    rate: 1.0, pitch: 0.98, volume: 1.0,
    hd: true,
    languages: ['en', 'es', 'fr', 'de'],
    description: 'Mission-critical command voice — high fidelity, multi-lingual core',
  },
  {
    id: 'M2',
    label: 'Agent Lee — Calm (Studio)',
    gender: 'male',
    voiceNameHints: [
      'Microsoft Davis Online (Natural)',
      'Microsoft Tony Online (Natural)',
      'Microsoft Steffan Online (Natural)',
      'Davis', 'David', 'Alex', 'Tom',
    ],
    rate: 0.88, pitch: 0.92, volume: 0.85,
    hd: true,
    languages: ['en', 'it', 'ja'],
    description: 'Measured, rich texture — optimized for consistent status reports',
  },
  {
    id: 'M3',
    label: 'Agent Lee — Alert (Ultra)',
    gender: 'male',
    voiceNameHints: [
      'Microsoft Christopher Online (Natural)',
      'Microsoft Jason Online (Natural)',
      'Christopher', 'Daniel', 'James', 'Guy',
    ],
    rate: 1.12, pitch: 1.05, volume: 1.00,
    hd: true,
    languages: ['en', 'pt', 'ru'],
    description: 'Aggressive, high-frequency focus — penetrates background noise',
  },
  // ── Female presets — prefer Microsoft Neural ──────────────────────────────
  {
    id: 'F1',
    label: 'Agent ARIA — Premium (Natural)',
    gender: 'female',
    voiceNameHints: [
      'Microsoft Aria Online (Natural)',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Sara Online (Natural)',
      'Aria', 'Jenny',
    ],
    rate: 1.0, pitch: 1.0, volume: 0.95,
    hd: true,
    languages: ['en', 'zh', 'ko'],
    description: 'Silky smooth neural clarity — default for wide-area monitoring',
  },
  {
    id: 'F2',
    label: 'Agent ARIA — Warm (Legacy)',
    gender: 'female',
    voiceNameHints: [
      'Microsoft Michelle Online (Natural)',
      'Microsoft Monica Online (Natural)',
      'Microsoft Nancy Online (Natural)',
      'Michelle', 'Monica', 'Karen', 'Susan',
    ],
    rate: 0.92, pitch: 0.97, volume: 0.90,
    hd: false,
    languages: ['en', 'fr', 'nl'],
    description: 'Familiar, empathetic advisor voice — compatible with all edge devices',
  },
  {
    id: 'F3',
    label: 'Agent ARIA — Technical (HD)',
    gender: 'female',
    voiceNameHints: [
      'Microsoft Elizabeth Online (Natural)',
      'Microsoft Cora Online (Natural)',
      'Microsoft Ana Online (Natural)',
      'Elizabeth', 'Zira', 'Victoria', 'Kathy',
    ],
    rate: 1.08, pitch: 1.02, volume: 1.0,
    hd: true,
    languages: ['en', 'de', 'pl', 'hi'],
    description: 'Precision-tuned for data readouts and governance enforcement',
  },
] as const;

export const DEFAULT_PRESET_ID = 'M1';

export function findPreset(id: string): VoicePreset | undefined {
  return VOICE_PRESETS.find(p => p.id === id);
}

export function getDefaultPreset(): VoicePreset {
  return VOICE_PRESETS.find(p => p.id === DEFAULT_PRESET_ID)!;
}

/** Persist user's chosen preset ID to localStorage. */
const STORAGE_KEY = 'leeway_voice_preset';

export function loadPresetId(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PRESET_ID; }
  catch { return DEFAULT_PRESET_ID; }
}

export function savePresetId(id: string): void {
  try { localStorage.setItem(STORAGE_KEY, id); }
  catch { /* ignore */ }
}
