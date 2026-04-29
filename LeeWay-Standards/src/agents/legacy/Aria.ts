/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.SOCIAL
TAG: AI.ORCHESTRATION.AGENT.ARIA.SOCIAL

COLOR_ONION_HEX:
NEON=#F97316
FLUO=#FB923C
PASTEL=#FED7AA

ICON_ASCII:
family=lucide
glyph=languages

5WH:
WHAT = Aria social and multi-language agent — manages multilingual sessions, speaker relaying, group translation
WHY = Enables Agent Lee to operate in multilingual environments and facilitate cross-language communication
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/Aria.ts
WHEN = 2026-04-04
HOW = Static class using Echo.translate() and deterministic conversation summaries for multilingual group facilitation

AGENTS:
ASSESS
AUDIT
leeway
ECHO

LICENSE:
MIT
*/

// agents/Aria.ts — Social & Multi-Language Agent
import { eventBus } from '../../core/EventBus';
import { Echo } from './Echo';

export class Aria {
  private static activeSessions: Map<string, { language: string; name?: string }> = new Map();

  static registerSpeaker(speakerId: string, language: string, name?: string) {
    this.activeSessions.set(speakerId, { language, name });
    eventBus.emit('agent:active', { agent: 'Aria', task: `Speaker registered: ${name || speakerId} (${language})` });
  }

  static async relayMessage(message: string, fromSpeaker: string, toLanguages: string[]): Promise<Map<string, string>> {
    const translations = new Map<string, string>();
    
    for (const lang of toLanguages) {
      const translated = await Echo.translate(message, lang);
      translations.set(lang, translated);
    }
    
    return translations;
  }

  static async facilitateGroupConversation(messages: { speakerId: string; text: string }[]): Promise<string> {
    const speakers = Array.from(this.activeSessions.entries());
    const targetLanguages = speakers.map(([, s]) => s.language);

    const speakerSummary = speakers
      .map(([speakerId, meta]) => `${meta.name ?? speakerId}(${meta.language})`)
      .join(', ');
    const messageSummary = messages
      .map(({ speakerId, text }) => `${speakerId}: ${text}`)
      .join(' | ');
    const translationPlan = [...new Set(targetLanguages)].join(', ');

    return `Group summary: participants ${speakerSummary}. Messages exchanged: ${messageSummary}. Translation targets required: ${translationPlan || 'none'}.`;
  }

  static getSpeakerCount(): number {
    return this.activeSessions.size;
  }
}

