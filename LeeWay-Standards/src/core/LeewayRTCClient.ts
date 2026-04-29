/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: CORE.VOICE.LEEWAY_RTC
TAG: CORE.VOICE.LEEWAY_RTC.CLIENT

COLOR_ONION_HEX:
NEON=#00FFD1
FLUO=#00B4FF
PASTEL=#C7F0FF

ICON_ASCII:
family=lucide
glyph=radio

5WH:
WHAT = LeeWay-Edge-RTC Client — WebRTC (mediasoup) bridge for voice/vision via local SFU
WHY = Primary voice & vision transport; local Phi model + Agent Lee persona for low-latency responses
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/LeewayRTCClient.ts
WHEN = 2026
HOW = mediasoup-client for transport; STT via Web Speech API; TTS via browser SpeechSynthesis; local Phi for inference

AGENTS:
ASSESS
ALIGN
AUDIT

LICENSE:
MIT
*/

import * as mediasoupClient from 'mediasoup-client';
import { eventBus } from './EventBus';
import AgentLeeResponseRouter from './AgentLeeResponseRouter';

export enum RTCState {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  LISTENING = 'listening',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  ERROR = 'error',
}

export interface RTCPeerInfo {
  peerId: string;
  name?: string;
  audio?: boolean;
  video?: boolean;
  isLocal?: boolean;
}

/**
 * LeewayRTCClient — connects Agent Lee to LeeWay-Edge-RTC (mediasoup SFU)
 * Handles voice stream (STT → local inference → TTS) and vision transport
 */
export class LeewayRTCClient {
  private static instance: LeewayRTCClient | null = null;
  private ws: WebSocket | null = null;
  private state: RTCState = RTCState.IDLE;
  private wsUrl: string;
  private httpUrl: string;
  
  private device: mediasoupClient.Device | null = null;
  private sendTransport: mediasoupClient.types.Transport | null = null;
  private recvTransport: mediasoupClient.types.Transport | null = null;
  private producers: Map<string, mediasoupClient.types.Producer> = new Map();
  
  private localStream: MediaStream | null = null;
  private speechRecognition: any = null;
  private isListening = false;
  private isAwake = false; // Adding wake mode state
  private onStateChange: ((state: RTCState) => void) | null = null;
  private peerId: string = '';
  private peers: Map<string, RTCPeerInfo> = new Map();
  private router: AgentLeeResponseRouter;

  private pendingRequests: Map<number, { resolve: (d: any) => void; reject: (e: Error) => void }> = new Map();
  private requestCounter = 0;

  private constructor(wsUrl?: string) {
    this.wsUrl = wsUrl || (import.meta.env.VITE_VOICE_WS_URL as string) || 'ws://localhost:3000/ws';
    this.httpUrl = this.wsUrl.replace('ws://', 'http://').replace('wss://', 'https://').replace('/ws', '');
    this.router = new AgentLeeResponseRouter();
  }

  static getInstance(wsUrl?: string): LeewayRTCClient {
    if (!LeewayRTCClient.instance) {
      LeewayRTCClient.instance = new LeewayRTCClient(wsUrl);
    }
    return LeewayRTCClient.instance;
  }

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  async connect(onStateChange?: (state: RTCState) => void): Promise<void> {
    if (this.state === RTCState.CONNECTED) return;
    this.onStateChange = onStateChange || null;
    this.setState(RTCState.CONNECTING);

    try {
      const token = await this.fetchToken();
      await this.connectWebSocket(token);
      await this.initializeMediasoup();
      await this.createRecvTransport();
      this.setupSTT();
      this.setState(RTCState.CONNECTED);
      this.reconnectAttempts = 0; // reset on success
    } catch (error) {
      this.setState(RTCState.ERROR);
      eventBus.emit('leeway-rtc:error', { error });
      this.handleReconnect();
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[LeewayRTCClient] Max reconnect attempts reached');
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[LeewayRTCClient] Reconnecting in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  private async fetchToken(): Promise<string> {
    const resp = await fetch(`${this.httpUrl}/dev/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sub: `agent-lee-${Math.random().toString(36).slice(2, 7)}` }),
    });
    const { token } = await resp.json();
    return token;
  }

  private connectWebSocket(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = async () => {
        try {
          const auth = await this.request('auth', { token });
          this.peerId = auth.peerId;
          resolve();
        } catch (e) { reject(e); }
      };
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id !== undefined) {
          const p = this.pendingRequests.get(msg.id);
          if (p) { this.pendingRequests.delete(msg.id); msg.ok === false ? p.reject(new Error(msg.error)) : p.resolve(msg); }
          return;
        }
        this.handlePush(msg);
      };
      this.ws.onerror = (e) => {
        console.error('[LeewayRTCClient] WebSocket Error:', e);
        this.handleReconnect();
        reject(e);
      };
      this.ws.onclose = () => {
        console.warn('[LeewayRTCClient] WebSocket Closed');
        if (this.state !== RTCState.IDLE) this.handleReconnect();
      };
    });
  }

  private async initializeMediasoup(): Promise<void> {
    const { routerRtpCapabilities } = await this.request('joinRoom', { roomId: 'leeway-main', rtpCapabilities: {} });
    this.device = new mediasoupClient.Device();
    await this.device.load({ routerRtpCapabilities });
  }

  private async createRecvTransport(): Promise<void> {
    const info = await this.request('createTransport', { direction: 'recv' });
    this.recvTransport = this.device!.createRecvTransport(info);
    this.recvTransport.on('connect', ({ dtlsParameters }, cb, eb) => {
      this.request('connectTransport', { transportId: this.recvTransport!.id, dtlsParameters }).then(cb).catch(eb);
    });
  }

  async publish(video: boolean = false): Promise<void> {
    if (!this.sendTransport) {
      const info = await this.request('createTransport', { direction: 'send' });
      this.sendTransport = this.device!.createSendTransport(info);
      this.sendTransport.on('connect', ({ dtlsParameters }, cb, eb) => {
        this.request('connectTransport', { transportId: this.sendTransport!.id, dtlsParameters }).then(cb).catch(eb);
      });
      this.sendTransport.on('produce', ({ kind, rtpParameters }, cb, eb) => {
        this.request('produce', { transportId: this.sendTransport!.id, kind, rtpParameters }).then(({ producerId }: any) => cb({ id: producerId })).catch(eb);
      });
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    for (const track of this.localStream.getTracks()) {
      const p = await this.sendTransport.produce({ track });
      this.producers.set(track.kind, p);
    }
  }

  private setupSTT(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    this.speechRecognition = new SR();
    this.speechRecognition.continuous = true;
    this.speechRecognition.onresult = (e: any) => {
      if (e.results[e.results.length - 1].isFinal) this.handleUserSpeech(e.results[e.results.length - 1][0].transcript);
    };
    this.speechRecognition.onend = () => this.isListening && this.speechRecognition.start();
  }

  async startListening(): Promise<void> { this.isListening = true; try { this.speechRecognition?.start(); } catch {} }
  stopListening(): void { this.isListening = false; this.speechRecognition?.stop(); }

  private async handleUserSpeech(t: string): Promise<void> {
    const text = t.trim().toLowerCase();
    if (!text) return;

    const isWakeWord = text.includes('agent lee') || text.includes('wake up');
    const isSleepWord = text.includes('go to sleep') || text.includes('stop listening');

    if (!this.isAwake) {
      if (isWakeWord) {
        this.isAwake = true;
        this.setState(RTCState.THINKING);
        await this.speak("Agent Lee online. How can I assist you?");
      }
      return; 
    }

    if (isSleepWord) {
      this.isAwake = false;
      await this.speak("Entering standby mode.");
      this.setState(RTCState.IDLE);
      return;
    }

    this.setState(RTCState.THINKING);
    eventBus.emit('leeway-rtc:user-said', { text: t });
    const result = await this.router.generateResponse(t);
    await this.speak(result.response);
  }

  async speak(text: string): Promise<void> {
    return new Promise((res) => {
      const u = new SpeechSynthesisUtterance(text);
      
      // Enforce Deep African-American Male Voice constraints (approximate via matching preferred System Voices)
      const voices = window.speechSynthesis.getVoices();
      // Look for a deep english male voice.
      const preferredVoices = voices.filter(v => v.lang.startsWith('en') && (v.name.includes('Male') || v.name.includes('David')));
      if (preferredVoices.length > 0) {
        u.voice = preferredVoices[0];
      }
      u.pitch = 0.5; // Deep pitch
      u.rate = 0.9;  // Deliberate and calm
      
      u.onstart = () => this.setState(RTCState.SPEAKING);
      u.onend = () => { this.setState(RTCState.LISTENING); res(); };
      window.speechSynthesis.speak(u);
    });
  }

  getLocalStream(): MediaStream | null { return this.localStream; }

  private request(type: string, data: any = {}): Promise<any> {
    return new Promise((res, rej) => {
      const id = ++this.requestCounter;
      this.pendingRequests.set(id, { resolve: res, reject: rej });
      this.ws?.send(JSON.stringify({ id, type, ...data }));
    });
  }

  private handlePush(msg: any): void {
    if (msg.type === 'newProducer') this.consume(msg.producerId, msg.peerId, msg.kind);
    else if (msg.type === 'text') eventBus.emit('leeway-rtc:peer-said', msg.payload);
  }

  private async consume(pid: string, peerId: string, kind: string): Promise<void> {
    const c = await this.request('consume', { transportId: this.recvTransport!.id, producerId: pid, rtpCapabilities: this.device!.rtpCapabilities });
    const consumer = await this.recvTransport!.consume(c);
    await this.request('resumeConsumer', { consumerId: consumer.id });
    eventBus.emit('leeway-rtc:new-track', { track: consumer.track, peerId, kind });
  }

  private setState(s: RTCState): void { 
    if (this.state === s) return; 
    this.state = s; 
    this.onStateChange?.(s); 
    eventBus.emit('leeway-rtc:state-change', { state: s }); 
  }

  disconnect(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.ws?.close();
    this.setState(RTCState.IDLE);
  }
}

export default LeewayRTCClient;
