/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.QUEUE
TAG: VOICE.SPEECH.QUEUE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=list-ordered
5WH:
  WHAT = LeeWay Speech Queue — priority-ordered TTS utterance manager
  WHY  = Ensures HIGH-priority system alerts barge in and cancel ambient speech;
         NORMAL responses are ordered correctly; LOW ambient filler never blocks
         operational comms — all with zero vendor TTS dependency
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/speech-queue.ts
  WHEN = 2026
  HOW  = SpeechSynthesisUtterance + custom priority queue;
         pauseBeforeMs injected via setTimeout;
         onIdle callback fires when queue empties
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// ─── Types ─────────────────────────────────────────────────────────────────────
export type SpeechPriority = 'high' | 'normal' | 'low';

export interface SpeechItem {
  /** Unique identifier for the item (used for deduplication / cancellation). */
  id: string;
  text: string;
  priority: SpeechPriority;
  rate: number;
  pitch: number;
  volume: number;
  /** Silence before speaking (ms). Applied via setTimeout before queuing utterance. */
  pauseBeforeMs: number;
  /** Silence after speaking ends before next item plays (ms). */
  pauseAfterMs: number;
  /** If specified, this exact voice is used; otherwise browser default applies. */
  voice?: SpeechSynthesisVoice;
  onStart?: () => void;
  onEnd?: () => void;
}

// ─── SpeechQueue ─────────────────────────────────────────────────────────────
export class SpeechQueue {
  private _queue: SpeechItem[] = [];
  private _speaking = false;
  /** Fires when the queue empties and speech finishes. */
  onIdle?: () => void;

  /**
   * Add an item to the queue.
   * - HIGH  → cancels current speech; item plays next (barge-in).
   * - NORMAL → inserted after all existing HIGH items.
   * - LOW   → appended to end.
   */
  enqueue(item: SpeechItem): void {
    if (item.priority === 'high') {
      this._cancel();
      this._queue.unshift(item);
    } else if (item.priority === 'normal') {
      const lastHigh = this._lastIndexOf('high');
      this._queue.splice(lastHigh + 1, 0, item);
    } else {
      this._queue.push(item);
    }
    if (!this._speaking) this._processNext();
  }

  /** Cancel current utterance and optionally remove a queued item by id. */
  remove(id: string): void {
    this._queue = this._queue.filter(i => i.id !== id);
  }

  /** Stop speaking and clear the entire queue. */
  clear(): void {
    this._queue = [];
    this._cancel();
    this.onIdle?.();
  }

  get isSpeaking(): boolean { return this._speaking; }
  get length(): number { return this._queue.length + (this._speaking ? 1 : 0); }

  // ─── Private ──────────────────────────────────────────────────────────────
  private _cancel(): void {
    if (typeof window === 'undefined') return;
    window.speechSynthesis.cancel();
    this._speaking = false;
  }

  private _lastIndexOf(priority: SpeechPriority): number {
    let idx = -1;
    for (let i = 0; i < this._queue.length; i++) {
      if (this._queue[i].priority === priority) idx = i;
    }
    return idx;
  }

  private _processNext(): void {
    const item = this._queue.shift();
    if (!item) {
      this._speaking = false;
      this.onIdle?.();
      return;
    }

    const speak = () => {
      if (typeof window === 'undefined') return;
      const utt = new SpeechSynthesisUtterance(item.text);
      utt.rate   = item.rate;
      utt.pitch  = item.pitch;
      utt.volume = item.volume;
      if (item.voice) utt.voice = item.voice;

      this._speaking = true;
      item.onStart?.();

      utt.onend = () => {
        item.onEnd?.();
        if (item.pauseAfterMs > 0) {
          setTimeout(() => this._processNext(), item.pauseAfterMs);
        } else {
          this._processNext();
        }
      };

      utt.onerror = (ev) => {
        // Suppress 'interrupted' — that's us cancelling intentionally
        if ((ev as SpeechSynthesisErrorEvent).error !== 'interrupted') {
          console.warn('[SpeechQueue] utterance error:', (ev as SpeechSynthesisErrorEvent).error);
        }
        this._processNext();
      };

      window.speechSynthesis.speak(utt);
    };

    if (item.pauseBeforeMs > 0) {
      setTimeout(speak, item.pauseBeforeMs);
    } else {
      speak();
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
export const speechQueue = new SpeechQueue();
