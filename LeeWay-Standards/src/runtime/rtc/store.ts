/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.RTC.STORE
TAG: CLIENT.RTC.HOOK.USESTORE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=zap
5WH:
  WHAT = Real useRTCStore hook — connects to LeeWay SFU via WebSocket + mediasoup-client
  WHY  = Replaces the mock store in LeeWay-Edge_RTC.tsx with live SFU signaling,
         transport management, consumer negotiation, and stats polling
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/rtc/store.ts
  WHEN = 2026
  HOW  = Fetch JWT from /dev/token → open WS → auth → load mediasoup Device →
         joinRoom → createRecvTransport → consume producers → poll getStats every 2s
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { useCallback, useEffect, useRef, useState } from 'react';
import * as mediasoupClient from 'mediasoup-client';
import { VectorAgent } from './vector-agent';
import { handleFallback, MeshFallback } from './mesh-fallback';
import { FederationRouter, SfuNode } from './federation-router';

declare global {
  interface Window {
    vectorAgentInst?: VectorAgent;
    meshFallbackInst?: MeshFallback;
  }
}

// ---------------------------------------------------------------------------
// Shared types (re-exported so LeeWay-Edge_RTC.tsx can import from one place)
// ---------------------------------------------------------------------------

export type ConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

export type IceConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

export interface PeerStats {
  id: string;
  name: string;
  bitrate: number;
  packetLoss: number;
  rtt: number;
  jitter: number;
  audioLevel: number;
  videoResolution?: string;
  isLocal?: boolean;
  state?: 'connected' | 'connecting' | 'degraded';
  transport?: 'direct' | 'turn' | 'unknown';
  audio?: boolean;
  video?: boolean;
  screen?: boolean;
}

export interface RTCEvent {
  id: string;
  timestamp: number;
  type: 'signaling' | 'rtc' | 'sfu' | 'turn' | 'system';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  source?: string;
}

export interface RTCState {
  roomName: string;
  peerId: string;
  connectionState: ConnectionState;
  iceState: IceConnectionState;
  signalingState: string;
  isRelay: boolean;
  selectedCandidatePair: string;
  peers: PeerStats[];
  events: RTCEvent[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Vite proxies /ws → SFU ws://localhost:3000 and /dev → SFU http://localhost:3000
const WS_URL = (apiKey: string) => {
  const base = (import.meta as { env?: Record<string, string> }).env?.['VITE_SIGNALING_URL'] ?? `ws://${window.location.host}/ws`;
  return `${base}?apiKey=${apiKey}`;
};

const TOKEN_URL =
  ((import.meta as { env?: Record<string, string> }).env?.['VITE_HTTP_BASE_URL'] ?? '') +
  '/dev/token';

const DEFAULT_ROOM = 'leeway-main';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _msgId = 0;
function nextId() {
  return ++_msgId;
}

const INITIAL_STATE: RTCState = {
  roomName: DEFAULT_ROOM,
  peerId: '',
  connectionState: 'new',
  iceState: 'new',
  signalingState: 'stable',
  isRelay: false,
  selectedCandidatePair: 'N/A',
  peers: [],
  events: [],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface RTCStoreAPI {
  state: RTCState;
  addEvent: (event: Omit<RTCEvent, 'id' | 'timestamp'>) => void;
  connect: (roomId?: string, apiKey?: string) => Promise<void>;
  disconnect: () => void;
  publish: (video?: boolean) => Promise<void>;
  stopPublish: () => Promise<void>;
  isPublishing: boolean;
}

export function useRTCStore(): RTCStoreAPI {
  const [state, setState] = useState<RTCState>(INITIAL_STATE);
  const [isPublishing, setIsPublishing] = useState(false);

  const wsRef           = useRef<WebSocket | null>(null);
  const deviceRef       = useRef<mediasoupClient.Device | null>(null);
  const sendTransRef    = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransRef    = useRef<mediasoupClient.types.Transport | null>(null);
  const producerRef     = useRef<mediasoupClient.types.Producer | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const statsTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRef      = useRef<
    Map<number, { resolve: (d: unknown) => void; reject: (e: Error) => void }>
  >(new Map());

  // ── addEvent ──────────────────────────────────────────────────────────────
  const addEvent = useCallback((event: Omit<RTCEvent, 'id' | 'timestamp'>) => {
    setState(prev => ({
      ...prev,
      events: [
        { ...event, id: crypto.randomUUID(), timestamp: Date.now() },
        ...prev.events,
      ].slice(0, 100),
    }));
  }, []);

  // ── request (WS RPC) ──────────────────────────────────────────────────────
  const request = useCallback(<T = unknown>(type: string, data: Record<string, unknown> = {}): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }
      const id = nextId();
      pendingRef.current.set(id, {
        resolve: resolve as (d: unknown) => void,
        reject,
      });
      ws.send(JSON.stringify({ id, type, ...data }));
    });
  }, []);

  // ── pollStats ─────────────────────────────────────────────────────────────
  const pollStats = useCallback(async () => {
    const reports: RTCStatsReport[] = [];
    if (sendTransRef.current) {
      try { reports.push(await sendTransRef.current.getStats()); } catch { /* noop */ }
    }
    if (recvTransRef.current) {
      try { reports.push(await recvTransRef.current.getStats()); } catch { /* noop */ }
    }
    if (reports.length === 0) return;

    let rtt = 0, bitrateOut = 0, packetLoss = 0, jitter = 0;
    let isRelay = false, candidatePair = 'N/A';

    for (const report of reports) {
      for (const raw of report.values()) {
        const s = raw as Record<string, unknown>;
        if (s['type'] === 'candidate-pair' && s['state'] === 'succeeded') {
          if (typeof s['currentRoundTripTime'] === 'number')
            rtt = Math.max(rtt, (s['currentRoundTripTime'] as number) * 1000);
          if (typeof s['availableOutgoingBitrate'] === 'number')
            bitrateOut = Math.max(bitrateOut, (s['availableOutgoingBitrate'] as number) / 1000);
        }
        if (s['type'] === 'remote-candidate' && String(s['candidateType']) === 'relay') {
          isRelay = true;
          candidatePair = `relay → ${String(s['address'] ?? 'TURN')}:${String(s['port'] ?? '')}`;
        }
        if (s['type'] === 'outbound-rtp' && typeof s['bytesSent'] === 'number')
          bitrateOut = Math.max(bitrateOut, (s['bytesSent'] as number) * 8 / 1000);
        if (s['type'] === 'inbound-rtp') {
          if (typeof s['jitter'] === 'number')
            jitter = Math.max(jitter, (s['jitter'] as number) * 1000);
          const received = (s['packetsReceived'] as number) ?? 0;
          const lost     = (s['packetsLost'] as number) ?? 0;
          if (received > 0)
            packetLoss = Math.max(packetLoss, (lost / (received + lost)) * 100);
        }
      }
    }

    setState(prev => {
      // Feed data to VECTOR
      if (!window.vectorAgentInst) window.vectorAgentInst = new VectorAgent();
      window.vectorAgentInst.push({ rtt, packetLoss, jitter, bitrate: bitrateOut });
      
      const action = window.vectorAgentInst.decision();
      if (action === 'reroute') {
        console.warn('VECTOR: Switching SFU / Rerouting');
        // federation failover trigger goes here
      } else if (action === 'degrade') {
        console.warn('VECTOR: Lowering quality / degrading video pipeline');
      }

      // Check mesh fallback conditions
      if (!window.meshFallbackInst) window.meshFallbackInst = new MeshFallback();
      if (prev.connectionState === 'failed' || prev.iceState === 'failed' || (!isRelay && rtt > 800)) {
         handleFallback(prev, window.meshFallbackInst).catch(console.error);
      }

      return {
        ...prev,
        isRelay,
        selectedCandidatePair: isRelay ? candidatePair : prev.selectedCandidatePair,
        peers: prev.peers.map((p, i) =>
          i === 0 ? { ...p, rtt, bitrate: bitrateOut, packetLoss, jitter } : p,
        ),
      };
    });
  }, []);

  // ── connect ───────────────────────────────────────────────────────────────
  const connect = useCallback(async (roomId: string = DEFAULT_ROOM, apiKey: string = '') => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return; // already connected

    setState(prev => ({ ...prev, connectionState: 'connecting', roomName: roomId }));
    addEvent({ type: 'signaling', level: 'info', message: 'Fetching session token...', source: 'AUTH' });

    const MAX_RETRIES = 3;
    const BASE_DELAY = 1000; // 1s

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // 1. JWT
        const sub = `operator-${Math.random().toString(36).slice(2, 7)}`;
        const tokenResp = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sub }),
        });
        if (!tokenResp.ok) throw new Error(`Token request failed: ${tokenResp.status}`);
        const { token } = (await tokenResp.json()) as { token: string };
        addEvent({ type: 'signaling', level: 'success', message: 'JWT issued — opening WebSocket...', source: 'AUTH' });

        // 2. WebSocket with timeout
        const wsUrl = WS_URL(apiKey);
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        const WS_OPEN_TIMEOUT = 10000; // 10s timeout
        await new Promise<void>((res, rej) => {
          const timer = setTimeout(() => {
            ws.close();
            rej(new Error(`WebSocket connection timeout (${WS_OPEN_TIMEOUT}ms). URL: ${wsUrl}`));
          }, WS_OPEN_TIMEOUT);

          ws.onopen = () => {
            clearTimeout(timer);
            res();
          };
          ws.onerror = (evt) => {
            clearTimeout(timer);
            const err = new Error(`WebSocket connection failed. URL: ${wsUrl}. Check if SFU server is running on port 3000.`);
            rej(err);
          };
        });
        addEvent({ type: 'signaling', level: 'info', message: `Connected to LeeWay SFU Uplink`, source: 'SIGNAL' });

      // 3. Message router
      ws.onmessage = (evt) => {
        const msg = JSON.parse(evt.data as string) as Record<string, unknown>;

        // RPC response
        if (msg['id'] !== undefined) {
          const pending = pendingRef.current.get(msg['id'] as number);
          if (pending) {
            pendingRef.current.delete(msg['id'] as number);
            if (msg['ok'] === false)
              pending.reject(new Error(String(msg['error'] ?? 'RPC error')));
            else
              pending.resolve(msg);
          }
          return;
        }

        // Server-push events
        if (msg['type'] === 'newProducer') {
          addEvent({ type: 'sfu', level: 'info', message: `New ${String(msg['kind'])} producer from peer ${String(msg['peerId']).slice(0, 8)}`, source: 'SFU' });
        }
        if (msg['type'] === 'peerLeft') {
          const pid = String(msg['peerId']);
          setState(prev => ({ ...prev, peers: prev.peers.filter(p => p.id !== pid) }));
          addEvent({ type: 'sfu', level: 'warn', message: `Peer disconnected: ${pid.slice(0, 8)}`, source: 'SFU' });
        }
        if (msg['type'] === 'agentEvent') {
          const lvl = String(msg['level']) as RTCEvent['level'];
          addEvent({ type: 'system', level: lvl, message: `[${String(msg['codename'])}] ${String(msg['msg'])}`, source: String(msg['codename']) });
        }
      };

      ws.onclose = () => {
        setState(prev => ({ ...prev, connectionState: 'disconnected', iceState: 'disconnected' }));
        addEvent({ type: 'signaling', level: 'warn', message: 'WebSocket closed', source: 'SIGNAL' });
        if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      };

      // 4. Auth
      const authResp = await request<{ peerId: string }>('auth', { token });
      const { peerId } = authResp;
      setState(prev => ({ ...prev, peerId }));

      // 5. mediasoup Device
      const device = new mediasoupClient.Device();
      deviceRef.current = device;

      // 6. Join room
      const joinResp = await request<{
        routerRtpCapabilities: mediasoupClient.types.RtpCapabilities;
        existingProducers: Array<{ producerId: string; peerId: string; kind: 'audio' | 'video' }>;
      }>('joinRoom', { roomId, rtpCapabilities: {} });

      await device.load({ routerRtpCapabilities: joinResp.routerRtpCapabilities });
      addEvent({ type: 'sfu', level: 'info', message: `Joined room "${roomId}" (${joinResp.existingProducers.length} producers)`, source: 'SFU' });

      // 7. Recv transport
      const recvInfo = await request<{
        transportId: string;
        iceParameters: mediasoupClient.types.IceParameters;
        iceCandidates: mediasoupClient.types.IceCandidate[];
        dtlsParameters: mediasoupClient.types.DtlsParameters;
      }>('createTransport', { direction: 'recv' });

      const recvTransport = device.createRecvTransport({
        id:             recvInfo.transportId,
        iceParameters:  recvInfo.iceParameters,
        iceCandidates:  recvInfo.iceCandidates,
        dtlsParameters: recvInfo.dtlsParameters,
      });
      recvTransRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }, cb, eb) => {
        request('connectTransport', { transportId: recvTransport.id, dtlsParameters })
          .then(() => cb()).catch(eb);
      });

      recvTransport.on('connectionstatechange', (s) => {
        const iceMap: Record<string, IceConnectionState> = {
          new: 'new', connecting: 'checking', connected: 'connected',
          failed: 'failed', disconnected: 'disconnected', closed: 'closed',
        };
        setState(prev => ({
          ...prev,
          iceState: iceMap[s] ?? 'new',
          signalingState: s === 'connected' ? 'stable' : prev.signalingState,
        }));
        if (s === 'connected')
          addEvent({ type: 'rtc', level: 'success', message: 'WebRTC Transport connected', source: 'RTC' });
      });

      // 8. Mark connected + add local peer
      setState(prev => ({
        ...prev,
        connectionState: 'connected',
        iceState: 'connected',
        peers: [{
          id: peerId,
          name: `operator-${peerId.slice(0, 5)}`,
          bitrate: 0, packetLoss: 0, rtt: 0, jitter: 0, audioLevel: 0,
          isLocal: true, state: 'connected', transport: 'direct',
          audio: false, video: false, screen: false,
        }],
      }));
      addEvent({ type: 'signaling', level: 'success', message: 'LeeWay Edge RTC session established', source: 'LEEWAY' });

      // 9. Consume existing producers
      for (const ep of joinResp.existingProducers) {
        try {
          const c = await request<{
            consumerId: string;
            kind: 'audio' | 'video';
            rtpParameters: mediasoupClient.types.RtpParameters;
          }>('consume', {
            transportId:     recvInfo.transportId,
            producerId:      ep.producerId,
            rtpCapabilities: device.rtpCapabilities,
          });

          const consumer = await recvTransport.consume({
            id:            c.consumerId,
            producerId:    ep.producerId,
            kind:          c.kind,
            rtpParameters: c.rtpParameters,
          });
          await request('resumeConsumer', { consumerId: consumer.id });

          setState(prev => {
            const exists = prev.peers.find(p => p.id === ep.peerId);
            if (exists) {
              return { ...prev, peers: prev.peers.map(p => p.id === ep.peerId ? { ...p, [ep.kind]: true } : p) };
            }
            return {
              ...prev,
              peers: [...prev.peers, {
                id: ep.peerId,
                name: `peer-${ep.peerId.slice(0, 5)}`,
                bitrate: 0, packetLoss: 0, rtt: 0, jitter: 0, audioLevel: 0,
                state: 'connected', transport: 'direct',
                audio: ep.kind === 'audio',
                video: ep.kind === 'video',
                screen: false,
              }],
            };
          });
        } catch (err) {
          console.warn('[LeeWay RTC] consume failed for producer', ep.producerId, err);
        }
      }

      // 10. Stats polling
      statsTimerRef.current = setInterval(() => { void pollStats(); }, 2000);

        // Connection succeeded — exit retry loop
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        wsRef.current?.close();
        wsRef.current = null;

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY * Math.pow(2, attempt); // exponential backoff
          addEvent({
            type: 'system',
            level: 'warn',
            message: `Connection attempt ${attempt + 1} failed: ${msg}. Retrying in ${delay}ms...`,
            source: 'SYSTEM'
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          setState(prev => ({ ...prev, connectionState: 'failed' }));
          addEvent({ type: 'system', level: 'error', message: `Connection failed after ${MAX_RETRIES} attempts: ${msg}`, source: 'SYSTEM' });
        }
      }
    }
  }, [request, pollStats, addEvent]);

  // ── disconnect ────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (statsTimerRef.current) { clearInterval(statsTimerRef.current); statsTimerRef.current = null; }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    producerRef.current?.close();
    producerRef.current = null;
    sendTransRef.current?.close();
    sendTransRef.current = null;
    recvTransRef.current?.close();
    recvTransRef.current = null;
    deviceRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setIsPublishing(false);
    setState({ ...INITIAL_STATE });
    addEvent({ type: 'system', level: 'info', message: 'Disconnected — session terminated', source: 'LEEWAY' });
  }, [addEvent]);

  // ── publish ───────────────────────────────────────────────────────────────
  const publish = useCallback(async (video = false) => {
    const device = deviceRef.current;
    if (!device) throw new Error('Not connected to SFU');

    if (!sendTransRef.current) {
      const info = await request<{
        transportId: string;
        iceParameters: mediasoupClient.types.IceParameters;
        iceCandidates: mediasoupClient.types.IceCandidate[];
        dtlsParameters: mediasoupClient.types.DtlsParameters;
      }>('createTransport', { direction: 'send' });

      const sendTransport = device.createSendTransport({
        id:             info.transportId,
        iceParameters:  info.iceParameters,
        iceCandidates:  info.iceCandidates,
        dtlsParameters: info.dtlsParameters,
      });
      sendTransRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }, cb, eb) => {
        request('connectTransport', { transportId: sendTransport.id, dtlsParameters })
          .then(() => cb()).catch(eb);
      });
      sendTransport.on('produce', ({ kind, rtpParameters }, cb, eb) => {
        request<{ producerId: string }>('produce', { transportId: sendTransport.id, kind, rtpParameters })
          .then(({ producerId }) => cb({ id: producerId }))
          .catch(eb);
      });

      addEvent({ type: 'rtc', level: 'success', message: 'Send transport ready', source: 'RTC' });
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;

    for (const track of stream.getTracks()) {
      const producer = await sendTransRef.current!.produce({ track });
      producerRef.current = producer;
    }

    setIsPublishing(true);
    setState(prev => ({
      ...prev,
      peers: prev.peers.map(p => p.isLocal ? { ...p, audio: true, video } : p),
    }));
    addEvent({ type: 'sfu', level: 'info', message: `Publishing ${video ? 'audio + video' : 'audio only'}`, source: 'SFU' });
  }, [request, addEvent]);

  // ── stopPublish ───────────────────────────────────────────────────────────
  const stopPublish = useCallback(async () => {
    if (producerRef.current) {
      await request('closeProducer', { producerId: producerRef.current.id }).catch(() => null);
      producerRef.current.close();
      producerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setIsPublishing(false);
    setState(prev => ({
      ...prev,
      peers: prev.peers.map(p => p.isLocal ? { ...p, audio: false, video: false } : p),
    }));
    addEvent({ type: 'sfu', level: 'info', message: 'Stopped publishing media', source: 'SFU' });
  }, [request, addEvent]);

  // ── cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (statsTimerRef.current) clearInterval(statsTimerRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { state, addEvent, connect, disconnect, publish, stopPublish, isPublishing };
}
