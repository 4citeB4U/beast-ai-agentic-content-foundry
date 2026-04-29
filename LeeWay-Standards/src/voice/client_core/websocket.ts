/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.SDK.WEBSOCKET.MAIN

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=file

5WH:
WHAT = websocket module
WHY = Part of CORE region
WHO = LEEWAY Align Agent
WHERE = voice\client_core\websocket.ts
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
 * websocket.ts – WebSocket connection manager for Agent Lee.
 *
 * Manages:
 * - Connection lifecycle (connect / reconnect)
 * - Sending audio frames and control events
 * - Dispatching incoming server events
 */

import type {
  ServerEvent,
  HelloEvent,
  InterruptEvent,
  TextEvent,
} from './types';

export type EventHandler<T extends ServerEvent> = (event: T) => void;
type AnyHandler = (event: ServerEvent) => void;

export class AgentLeeSocket {
  private _ws: WebSocket | null = null;
  private _url: string;
  private _handlers = new Map<string, AnyHandler[]>();
  private _reconnectDelay = 1500;
  private _connected = false;
  private _pendingAudio: ArrayBuffer[] = [];

  /** Next expected audio chunk (binary frame follows a JSON audio_out event) */
  private _audioHandler: ((buf: ArrayBuffer) => void) | null = null;

  constructor(url: string) {
    this._url = url;
  }

  // ── Connection ─────────────────────────────────────────────────────────────

  connect(): void {
    if (this._ws?.readyState === WebSocket.OPEN) return;

    this._ws = new WebSocket(this._url);
    this._ws.binaryType = 'arraybuffer';

    this._ws.onopen = () => {
      this._connected = true;
      this._reconnectDelay = 1500;
      console.log('[AgentLee] WebSocket connected.');
      this._sendHello();
      // Flush buffered audio
      for (const buf of this._pendingAudio) {
        this._ws?.send(buf);
      }
      this._pendingAudio = [];
    };

    this._ws.onclose = () => {
      this._connected = false;
      console.log(`[AgentLee] WS closed. Reconnecting in ${this._reconnectDelay}ms…`);
      setTimeout(() => this.connect(), this._reconnectDelay);
      this._reconnectDelay = Math.min(this._reconnectDelay * 2, 15000);
    };

    this._ws.onerror = (e) => {
      console.error('[AgentLee] WS error:', e);
    };

    this._ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        // Binary frame = PCM audio chunk
        this._audioHandler?.(e.data);
        return;
      }
      if (typeof e.data === 'string') {
        try {
          const event = JSON.parse(e.data) as ServerEvent;
          this._dispatch(event);
        } catch {
          console.warn('[AgentLee] Invalid JSON:', e.data);
        }
      }
    };
  }

  disconnect(): void {
    this._ws?.close();
    this._ws = null;
  }

  // ── Sending ────────────────────────────────────────────────────────────────

  sendAudio(pcm: ArrayBuffer): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(pcm);
    } else {
      this._pendingAudio.push(pcm);
    }
  }

  sendInterrupt(): void {
    this._sendJson({ type: 'interrupt' } satisfies InterruptEvent);
  }

  sendText(text: string): void {
    this._sendJson({ type: 'text', text } satisfies TextEvent);
  }

  private _sendHello(): void {
    const hello: HelloEvent = {
      type: 'hello',
      version: '1',
      capabilities: ['audio', 'barge-in', 'text'],
      sample_rate: 16000,
      channels: 1,
    };
    this._sendJson(hello);
  }

  private _sendJson(data: unknown): void {
    if (this._ws?.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────────

  on<T extends ServerEvent>(type: T['type'], handler: EventHandler<T>): void {
    if (!this._handlers.has(type)) this._handlers.set(type, []);
    this._handlers.get(type)!.push(handler as AnyHandler);
  }

  onAudio(handler: (buf: ArrayBuffer) => void): void {
    this._audioHandler = handler;
  }

  private _dispatch(event: ServerEvent): void {
    const handlers = this._handlers.get(event.type) ?? [];
    for (const h of handlers) h(event);
  }

  get isConnected(): boolean {
    return this._connected;
  }
}
