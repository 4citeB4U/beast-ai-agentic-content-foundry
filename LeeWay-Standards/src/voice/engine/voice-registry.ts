/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.REGISTRY
TAG: VOICE.REGISTRY.DISCOVERY
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=mic-vocal
5WH:
  WHAT = LeeWay Voice Registry — discovers and classifies all browser TTS voices at runtime
  WHY  = SpeechSynthesis.getVoices() is async and device-dependent; this registry
         fires onReady once voices are stable and provides gender/quality classification
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/voice-registry.ts
  WHEN = 2026
  HOW  = speechSynthesis.getVoices() + voiceschanged event; heuristic name-based
         gender detection; local-service flag for quality; singleton exported
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// ─── Types ─────────────────────────────────────────────────────────────────────
export type VoiceGender  = 'male' | 'female' | 'unknown';
export type VoiceQuality = 'enhanced' | 'standard';

export interface VoiceEntry {
  voice: SpeechSynthesisVoice;
  gender: VoiceGender;
  quality: VoiceQuality;
  lang: string;
}

// ─── Gender heuristic ─────────────────────────────────────────────────────────
const MALE_PATTERN = /\b(david|james|guy|mark|daniel|alex|fred|tom|eric|jorge|eddy|albert|ryan|brian|christopher|davis|jason|roger|steffan|tony|liam|oliver|ethan|noah|alfie|elliot|thomas)\b|microsoft (guy|eric|brian|ryan|christopher|davis|jason|roger|steffan|tony|liam|oliver|thomas)/i;
const FEMALE_PATTERN = /\b(samantha|victoria|ava|allison|susan|kathy|vicki|fiona|moira|tessa|kate|karen|zira|hazel|aria|jenny|michelle|sara|monica|nancy|ana|elizabeth|cora|maisie|sonia|libby|bella|phoebe|hollie|isla|lily|ruby|abbi|olivia)\b|microsoft (aria|jenny|michelle|sara|monica|nancy|ana|elizabeth|cora|maisie|sonia|libby)|microsoft zira/i;

function detectGender(name: string): VoiceGender {
  if (MALE_PATTERN.test(name))   return 'male';
  if (FEMALE_PATTERN.test(name)) return 'female';
  return 'unknown';
}

// ─── Registry ─────────────────────────────────────────────────────────────────
class VoiceRegistry {
  private _entries: VoiceEntry[] = [];
  private _ready = false;
  private _listeners: Array<() => void> = [];

  /** Call once at app startup. Safe to call multiple times (idempotent). */
  init(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const populate = () => {
      const all = window.speechSynthesis.getVoices();
      if (!all.length) return; // not ready yet — wait for voiceschanged
      this._entries = all
        .filter(v => v.lang.startsWith('en'))
        .map(v => ({
          voice: v,
          gender: detectGender(v.name),
          quality: v.localService ? 'enhanced' : 'standard',
          lang: v.lang,
        }));
      if (!this._ready) {
        this._ready = true;
        this._listeners.forEach(l => l());
        this._listeners = [];
      }
    };

    populate();
    window.speechSynthesis.addEventListener('voiceschanged', populate);
  }

  /** Subscribe to "registry ready" (fires immediately if already ready). */
  onReady(fn: () => void): void {
    if (this._ready) fn();
    else this._listeners.push(fn);
  }

  get isReady(): boolean { return this._ready; }

  getAll(): VoiceEntry[] { return [...this._entries]; }

  getMale(): VoiceEntry[] {
    return this._entries.filter(v => v.gender === 'male');
  }

  getFemale(): VoiceEntry[] {
    return this._entries.filter(v => v.gender === 'female');
  }

  /** Find the best voice matching any of the hint substrings (in order). */
  findByHints(hints: string[]): SpeechSynthesisVoice | null {
    for (const hint of hints) {
      const found = this._entries.find(e =>
        e.voice.name.toLowerCase().includes(hint.toLowerCase()),
      );
      if (found) return found.voice;
    }
    // Fallback: first English voice available
    return this._entries[0]?.voice ?? null;
  }

  /** Find a voice by exact name. */
  findByName(name: string): SpeechSynthesisVoice | null {
    return this._entries.find(e => e.voice.name === name)?.voice ?? null;
  }
}

export const voiceRegistry = new VoiceRegistry();
