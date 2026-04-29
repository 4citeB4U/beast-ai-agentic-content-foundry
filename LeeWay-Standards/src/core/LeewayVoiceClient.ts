/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.VOICE.CLIENT
TAG: CORE.VOICE.CLIENT.RTC

5WH:
WHAT = LeewayVoiceClient — Voice bridge to LeeWay RTC WebSocket & Edge-TTS. No cloud APIs.
WHY = Provides voice session interface for Agent Lee using only LeeWay-owned infrastructure.
WHO = Leonard Lee — Leeway Industries
WHERE = core/LeewayVoiceClient.ts
WHEN = 2026

LICENSE:
MIT — LeeWay Industries
*/

// core/LeewayVoiceClient.ts
// LeeWay RTC voice bridge — routes voice through LeeWay Edge WebSocket.
// Zero cloud APIs. No leeway, no third-party vendors.

const LEEWAY_WS_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_VOICE_WS_URL)
  ? import.meta.env.VITE_VOICE_WS_URL
  : 'ws://localhost:3000/ws';

export interface LeewayVoiceSessionConfig {
  model?: string;
  systemPrompt?: string;
  onMessage?: (msg: { text?: string; audioBase64?: string }) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

/**
 * LeewayVoiceClient
 * Bridges Agent Lee voice to the LeeWay RTC edge server.
 * Created by Leonard Lee · Leeway Industries · 2026
 */
export class LeewayVoiceClient {
  private ws: WebSocket | null = null;
  private config: LeewayVoiceSessionConfig = {};

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(_apiKey: string, config: LeewayVoiceSessionConfig): Promise<void> {
    this.config = config;
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(LEEWAY_WS_URL);

        this.ws.onopen = () => {
          console.info('[LeewayVoiceClient] Connected to LeeWay RTC voice server');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            config.onMessage?.(msg);
          } catch {
            config.onMessage?.({ text: event.data });
          }
        };

        this.ws.onerror = () => {
          const err = new Error('[LeewayVoiceClient] WebSocket error — check LeeWay RTC server');
          config.onError?.(err);
          reject(err);
        };

        this.ws.onclose = () => {
          config.onClose?.();
        };

      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  sendText(text: string): void {
    if (!this.isConnected) {
      console.warn('[LeewayVoiceClient] Not connected — cannot send text');
      return;
    }
    this.ws!.send(JSON.stringify({ type: 'text', content: text }));
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance for VoiceService
export const leewayVoiceClient = new LeewayVoiceClient();
export default LeewayVoiceClient;

