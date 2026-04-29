/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.SDK.STANDALONEAGENT.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = standaloneAgent module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = voice\client_core\standaloneAgent.ts
WHEN = 2026
HOW = Auto-aligned by LEEWAY align-agent

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/
// CHAIN: Standards → Integrated → Runtime → Projections


/**
 * standaloneAgent.ts — Agent Lee, no server required.
 *
 * Uses:
 *  - Web Speech API (SpeechRecognition) for STT
 *  - Web Speech API (SpeechSynthesis)    for TTS
 *  - Agent Lee Persona Engine             for rule-based responses
 *
 * No API keys. No network calls. Works fully offline on GitHub Pages.
 */

import { AgentUI } from './ui';
import { respondToInput, MODES } from './lib/agentLeePersona';
import type { Mode, ConversationMessage } from './lib/agentLeePersona';

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSpeechRecognitionCtor(): typeof SpeechRecognition | null {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function hasSpeechSynthesis(): boolean {
  return 'speechSynthesis' in window;
}

// ── Standalone Agent ──────────────────────────────────────────────────────────
class StandaloneAgent {
  private ui: AgentUI;
  private history: ConversationMessage[] = [];
  private mode: Mode = MODES.DEFAULT;

  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isSpeaking = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  // Persona mode UI elements (optional – graceful no-op if absent)
  private modeCharmingBtn: HTMLButtonElement | null;
  private modeProducerBtn: HTMLButtonElement | null;
  private modeDefaultBtn: HTMLButtonElement | null;
  private modeBadge: HTMLElement | null;

  constructor(ui: AgentUI) {
    this.ui = ui;

    this.modeCharmingBtn =
      document.getElementById('mode-charming') as HTMLButtonElement | null;
    this.modeProducerBtn =
      document.getElementById('mode-producer') as HTMLButtonElement | null;
    this.modeDefaultBtn =
      document.getElementById('mode-default') as HTMLButtonElement | null;
    this.modeBadge = document.getElementById('persona-mode');
  }

  // ── Initialise ──────────────────────────────────────────────────────────────
  init(): void {
    this._preloadVoice();
    this._bindModeButtons();
    this._updateModeBadge();

    // Mic button
    this.ui.onMicClick(() => this._onMicClick());

    // Text input
    this.ui.onSendText((text) => {
      void this._handleUserText(text);
    });

    this.ui.setState('idle');

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      this.ui.showError(
        'stt_unavailable',
        'Speech recognition is not supported in this browser. Please use Chrome or Edge, or type below.',
      );
    }

    const noTTS = !hasSpeechSynthesis();
    if (noTTS) {
      this.ui.showError('tts_unavailable', 'Text-to-speech is not supported in this browser. Responses will appear as text only.');
    }

    // Greet the user on load
    this._greet();
  }

  // ── Voice preload ───────────────────────────────────────────────────────────
  private _preloadVoice(): void {
    if (!hasSpeechSynthesis()) return;
    const load = () => {
      const voices = window.speechSynthesis.getVoices();
      // Prefer a deep male US English voice
      this.selectedVoice =
        voices.find((v) => /david|daniel|james|guy|mark/i.test(v.name) && v.lang.startsWith('en')) ??
        voices.find((v) => v.lang === 'en-US') ??
        voices.find((v) => v.lang.startsWith('en')) ??
        null;
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }

  // ── Mode handling ───────────────────────────────────────────────────────────
  private _bindModeButtons(): void {
    this.modeDefaultBtn?.addEventListener('click', () => this._setMode(MODES.DEFAULT));
    this.modeCharmingBtn?.addEventListener('click', () =>
      this._setMode(MODES.CHARMING_PROFESSIONAL),
    );
    this.modeProducerBtn?.addEventListener('click', () =>
      this._setMode(MODES.PRODUCER_PROTOCOL),
    );
  }

  private _setMode(mode: Mode): void {
    this.mode = mode;
    this._updateModeBadge();
    this._updateModeButtons(mode);
    console.log('[AgentLee] Mode →', mode);
  }

  private _updateModeButtons(active: Mode): void {
    const map: Array<[HTMLButtonElement | null, Mode]> = [
      [this.modeDefaultBtn, MODES.DEFAULT],
      [this.modeCharmingBtn, MODES.CHARMING_PROFESSIONAL],
      [this.modeProducerBtn, MODES.PRODUCER_PROTOCOL],
    ];
    for (const [btn, m] of map) {
      if (!btn) continue;
      btn.classList.toggle('btn-mode-active', m === active);
    }
  }

  private _updateModeBadge(): void {
    if (!this.modeBadge) return;
    const labels: Record<Mode, string> = {
      default: '🎙 Default',
      charming_professional: '✨ Charming Pro',
      producer_protocol: '🎛 Producer',
    };
    this.modeBadge.textContent = labels[this.mode];
  }

  // ── Greet ───────────────────────────────────────────────────────────────────
  private _greet(): void {
    const greeting =
      "Agent Lee online. I'm fully embedded — no servers, no API keys. Talk to me or type below.";
    this._addAssistantMessage(greeting);
    this.ui.setFinalResponse(greeting, 'local');
    void this._speak(greeting);
  }

  // ── Mic click ───────────────────────────────────────────────────────────────
  private _onMicClick(): void {
    if (this.isSpeaking) {
      // Barge-in: cancel TTS and start listening
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
    }

    if (this.isListening) {
      this._stopListening();
    } else {
      this._startListening();
    }
  }

  // ── STT ─────────────────────────────────────────────────────────────────────
  private _startListening(): void {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) return;

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.lang = 'en-US';
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;
    this.recognition.continuous = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.ui.setState('listening');
      this.ui.setMicActive(true);
      this.ui.clearResponse();
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t;
        } else {
          interim += t;
        }
      }
      if (interim) this.ui.setPartialTranscript(interim);
      if (final) {
        this.ui.setFinalTranscript(final, event.results[event.results.length - 1][0].confidence);
        void this._handleUserText(final);
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('[AgentLee] STT error:', event.error);
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        this.ui.showError('stt_error', `Speech error: ${event.error}`);
      }
      this._stopListening();
    };

    this.recognition.onend = () => {
      this._stopListening();
    };

    this.recognition.start();
  }

  private _stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // already stopped
      }
      this.recognition = null;
    }
    this.isListening = false;
    this.ui.setMicActive(false);
    if (!this.isSpeaking) {
      this.ui.setState('idle');
    }
  }

  // ── Process user input ───────────────────────────────────────────────────────
  private async _handleUserText(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;

    this._stopListening();
    this.ui.setState('thinking');

    this.history.push({ role: 'user', content: trimmed });

    // Tiny artificial delay so "thinking" state is visible
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    const response = respondToInput(trimmed, this.history, this.mode);

    this._addAssistantMessage(response);
    this.ui.setFinalResponse(response, 'local');

    await this._speak(response);
  }

  // ── TTS ──────────────────────────────────────────────────────────────────────
  private async _speak(text: string): Promise<void> {
    if (!hasSpeechSynthesis()) {
      this.ui.setState('idle');
      return;
    }

    return new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 1.0;
      if (this.selectedVoice) utterance.voice = this.selectedVoice;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.ui.setState('speaking');
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.ui.setState('idle');
        resolve();
      };

      utterance.onerror = () => {
        this.isSpeaking = false;
        this.ui.setState('idle');
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // ── History helper ────────────────────────────────────────────────────────────
  private _addAssistantMessage(content: string): void {
    this.history.push({ role: 'assistant', content });
    // Keep history from growing unbounded
    if (this.history.length > 40) this.history = this.history.slice(-40);
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────
export function initStandaloneAgent(): void {
  const ui = new AgentUI();
  const agent = new StandaloneAgent(ui);
  agent.init();
}
