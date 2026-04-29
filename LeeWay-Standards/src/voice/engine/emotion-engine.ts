/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.EMOTION
TAG: VOICE.EMOTION.ENGINE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=activity
5WH:
  WHAT = LeeWay Emotion Engine — maps system state + text patterns to TTS parameter deltas
  WHY  = Adds perceived intelligence and expressiveness to the voice output while
         remaining fully deterministic and Pi-safe — no neural voice generation,
         no vendor TTS, no compute cost
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/emotion-engine.ts
  WHEN = 2026
  HOW  = Keyword + context rules → EmotionParams → multiplied against VoicePreset
         base rate/pitch/volume; pauses injected via setTimeout in speech-queue
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// ─── Types ─────────────────────────────────────────────────────────────────────
export type Emotion =
  | 'neutral'
  | 'calm'
  | 'alert'
  | 'urgent'
  | 'warm'
  | 'concerned'
  | 'satisfied'
  | 'analytical';

export interface EmotionParams {
  /** Multiplied against the preset's base rate. */
  rateFactor: number;
  /** Multiplied against the preset's base pitch. */
  pitchFactor: number;
  /** Multiplied against the preset's base volume. */
  volumeFactor: number;
  /** Silence injected before speaking (milliseconds). */
  pauseBeforeMs: number;
  /** Silence after speaking ends before next item is dequeued (milliseconds). */
  pauseAfterMs: number;
}

export interface AppliedVoiceParams {
  rate: number;
  pitch: number;
  volume: number;
  pauseBeforeMs: number;
  pauseAfterMs: number;
}

// ─── Emotion map ──────────────────────────────────────────────────────────────
/**
 * All values are safe multipliers — clamped before use so
 * SpeechSynthesisUtterance never receives an out-of-range value.
 */
const EMOTION_MAP: Record<Emotion, EmotionParams> = {
  neutral:    { rateFactor: 1.00, pitchFactor: 1.00, volumeFactor: 1.00, pauseBeforeMs:   0, pauseAfterMs: 200 },
  calm:       { rateFactor: 0.88, pitchFactor: 0.96, volumeFactor: 0.88, pauseBeforeMs: 120, pauseAfterMs: 350 },
  alert:      { rateFactor: 1.10, pitchFactor: 1.04, volumeFactor: 1.00, pauseBeforeMs:   0, pauseAfterMs: 120 },
  urgent:     { rateFactor: 1.22, pitchFactor: 1.08, volumeFactor: 1.00, pauseBeforeMs:   0, pauseAfterMs:   0 },
  warm:       { rateFactor: 0.92, pitchFactor: 0.97, volumeFactor: 0.88, pauseBeforeMs: 160, pauseAfterMs: 420 },
  concerned:  { rateFactor: 0.86, pitchFactor: 0.94, volumeFactor: 0.84, pauseBeforeMs: 200, pauseAfterMs: 450 },
  satisfied:  { rateFactor: 0.94, pitchFactor: 1.02, volumeFactor: 0.90, pauseBeforeMs:   0, pauseAfterMs: 320 },
  analytical: { rateFactor: 0.94, pitchFactor: 0.97, volumeFactor: 0.90, pauseBeforeMs:  60, pauseAfterMs: 260 },
};

// ─── Keyword patterns for text-based detection ────────────────────────────────
const URGENT_PAT    = /CRITICAL|EMERGENCY|FAIL(ED|URE)|DOWN|OFFLINE|BREACH|THREAT/i;
const ALERT_PAT     = /WARNING|ALERT|DEGRAD|HIGH PACKET|ANOMAL|SPIKE/i;
const SATISFIED_PAT = /NOMINAL|STABLE|HEALTHY|CONNECTED|ONLINE|OK|CLEAN|GOOD/i;
const ANALYTIC_PAT  = /ANALYZ|SCANN|PROCESS|CHECK|INSPECT|AUDIT|EVALUAT/i;
const WARM_PAT      = /RECOMMEND|SUGGEST|CONSIDER|ADVISE|HELP|ASSIST/i;
const CALM_PAT      = /MONITOR|WATCH|OBSERV|IDLE|QUIET|STANDBY/i;

// ─── Detection ────────────────────────────────────────────────────────────────
export interface EmotionContext {
  isAlert?: boolean;
  isError?: boolean;
  isPoorSignal?: boolean;
  isRecovery?: boolean;
}

/**
 * Determine the correct emotion for a given response text + optional context.
 * Context overrides take priority over text patterns.
 * Pure function — deterministic, zero cost.
 */
export function detectEmotion(text: string, ctx?: EmotionContext): Emotion {
  if (ctx?.isAlert)        return 'urgent';
  if (ctx?.isError)        return 'concerned';
  if (ctx?.isRecovery)     return 'satisfied';
  if (ctx?.isPoorSignal)   return 'alert';
  if (URGENT_PAT.test(text))    return 'urgent';
  if (ALERT_PAT.test(text))     return 'alert';
  if (SATISFIED_PAT.test(text)) return 'satisfied';
  if (ANALYTIC_PAT.test(text))  return 'analytical';
  if (WARM_PAT.test(text))      return 'warm';
  if (CALM_PAT.test(text))      return 'calm';
  return 'neutral';
}

// ─── Application ─────────────────────────────────────────────────────────────
/**
 * Apply an emotion to base TTS parameters from a VoicePreset.
 * Values are clamped to valid SpeechSynthesisUtterance ranges.
 */
export function applyEmotion(
  emotion: Emotion,
  baseRate: number,
  basePitch: number,
  baseVolume: number,
): AppliedVoiceParams {
  const p = EMOTION_MAP[emotion] ?? EMOTION_MAP.neutral;
  return {
    rate:         Math.min(2.0, Math.max(0.1, baseRate   * p.rateFactor)),
    pitch:        Math.min(2.0, Math.max(0.0, basePitch  * p.pitchFactor)),
    volume:       Math.min(1.0, Math.max(0.0, baseVolume * p.volumeFactor)),
    pauseBeforeMs: p.pauseBeforeMs,
    pauseAfterMs:  p.pauseAfterMs,
  };
}
