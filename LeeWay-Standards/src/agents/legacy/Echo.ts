/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.ECHO.VOICE

COLOR_ONION_HEX:
NEON=#EC4899
FLUO=#F472B6
PASTEL=#FBCFE8

ICON_ASCII:
family=lucide
glyph=mic-2

5WH:
WHAT = Echo voice and emotion intelligence agent — detects tone, language, adapts Agent Lee's communication style
WHY = Allows Agent Lee to respond with emotional awareness and adapt style to the user's detected state
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/Echo.ts
WHEN = 2026-04-04
HOW = Static class with analyzeEmotion(), translate(), detectLanguage() methods and speaker session tracking

AGENTS:
ASSESS
AUDIT
leeway
ECHO

LICENSE:
MIT
*/

// agents/Echo.ts — Voice, Emotion & Language Agent
// Always listening. Detects tone, emotion, language.
// Adapts Agent Lee's responses to match the user's emotional state.

import { VoiceService } from '../../core/VoiceService';
import { eventBus } from '../../core/EventBus';

export type EmotionState = 
  | 'calm' | 'excited' | 'frustrated' | 'sad' | 'curious' 
  | 'confused' | 'happy' | 'urgent' | 'playful' | 'serious';

export type ResponseStyle = 
  | 'normal' | 'poem' | 'story' | 'riddle' | 'simple' | 'technical' | 'enthusiastic';

export interface EmotionAnalysis {
  emotion: EmotionState;
  confidence: number;       // 0-1
  language: string;         // ISO code e.g. 'en', 'es', 'fr'
  speakerId: string;        // 'user1', 'user2' etc for multi-user
  recommendedStyle: ResponseStyle;
  urgency: 'low' | 'medium' | 'high';
}

const STYLE_MAP: Record<EmotionState, ResponseStyle> = {
  calm: 'normal',
  excited: 'enthusiastic',
  frustrated: 'simple',
  sad: 'story',
  curious: 'poem',
  confused: 'simple',
  happy: 'enthusiastic',
  urgent: 'technical',
  playful: 'riddle',
  serious: 'technical',
};

function detectLanguageFromText(text: string): string {
  const lower = text.toLowerCase();
  if (/\b(hola|gracias|buenos|adios|por favor)\b/.test(lower)) return 'es';
  if (/\b(bonjour|merci|salut|oui|non)\b/.test(lower)) return 'fr';
  return 'en';
}

function detectEmotionFromText(text: string): Pick<EmotionAnalysis, 'emotion' | 'confidence' | 'urgency'> {
  const lower = text.toLowerCase();
  if (/!{2,}|\burgent\b|\bnow\b|\basap\b/.test(lower)) return { emotion: 'urgent', confidence: 0.82, urgency: 'high' };
  if (/\b(confused|lost|dont understand|don't understand|unclear)\b/.test(lower)) return { emotion: 'confused', confidence: 0.78, urgency: 'medium' };
  if (/\b(sad|sorry|upset|hurt)\b/.test(lower)) return { emotion: 'sad', confidence: 0.75, urgency: 'medium' };
  if (/\b(excited|awesome|amazing|lets go|let's go)\b/.test(lower)) return { emotion: 'excited', confidence: 0.8, urgency: 'medium' };
  if (/\b(why|how|what if|curious|wonder)\b/.test(lower)) return { emotion: 'curious', confidence: 0.7, urgency: 'low' };
  return { emotion: 'calm', confidence: 0.6, urgency: 'low' };
}

export class Echo {
  private static currentSpeakers: Map<string, EmotionAnalysis> = new Map();

  static async analyzeEmotion(text: string, speakerId = 'user1'): Promise<EmotionAnalysis> {
    try {
      const language = detectLanguageFromText(text);
      const parsed = detectEmotionFromText(text);
      const analysis: EmotionAnalysis = {
        ...parsed,
        language,
        speakerId,
        recommendedStyle: STYLE_MAP[parsed.emotion] || 'normal',
      };

      this.currentSpeakers.set(speakerId, analysis);
      
      eventBus.emit('emotion:detected', {
        emotion: analysis.emotion,
        confidence: analysis.confidence,
        style: analysis.recommendedStyle,
      });

      return analysis;
    } catch {
      return {
        emotion: 'calm',
        confidence: 0.5,
        language: 'en',
        speakerId,
        recommendedStyle: 'normal',
        urgency: 'low',
      };
    }
  }

  static async translate(text: string, targetLanguage: string, sourceLang?: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'Aria', task: `Translating to ${targetLanguage}` });
    const detectedSource = sourceLang ?? detectLanguageFromText(text);
    if (detectedSource === targetLanguage) {
      return text;
    }
    return `[${detectedSource}->${targetLanguage}] ${text}`;
  }

  static async detectLanguage(text: string): Promise<string> {
    return detectLanguageFromText(text);
  }

  static getSpeakers(): EmotionAnalysis[] {
    return Array.from(this.currentSpeakers.values());
  }

  static getSpeaker(speakerId: string): EmotionAnalysis | undefined {
    return this.currentSpeakers.get(speakerId);
  }

  static clearSpeakers() {
    this.currentSpeakers.clear();
  }

  /**
   * Speak text via voice-agent-mcp Edge-TTS (with auto language detection).
   * Falls back to browser SpeechSynthesis if MCP agent is unreachable.
   */
  static async speak(text: string, language?: string): Promise<void> {
    eventBus.emit('agent:active', { agent: 'Echo', task: 'Speaking response' });
    await VoiceService.speak({ text, language });
  }

  /** Stop any currently playing TTS. */
  static stopSpeaking(): void {
    VoiceService.stop();
  }
}

