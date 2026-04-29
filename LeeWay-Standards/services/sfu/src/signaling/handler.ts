/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.SIGNALING
TAG: SFU.WS.SIGNALING.HANDLER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=zap
5WH:
  WHAT = WebSocket signaling handler — auth, room join, transport, produce, consume
  WHY  = Drives the mediasoup signaling protocol over persistent WS connections
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/signaling/handler.ts
  WHEN = 2026
  HOW  = Message-type dispatch per WS connection; JWT validation; agentBus event relay
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { types } from 'mediasoup';

import { verifyToken } from '../auth.js';
import { getOrCreateRoom, getRoom } from '../mediasoup/room.js';
import { logger } from '../logger.js';
import { metrics } from '../metrics.js';
import { config } from '../config.js';
import { agentBus } from '../agents/registry.js';

// ─── Message types ────────────────────────────────────────────────────────────

interface BaseMessage {
  id?: string | number;
  type: string;
}

interface AuthMessage extends BaseMessage {
  type: 'auth';
  token: string;
}

interface JoinRoomMessage extends BaseMessage {
  type: 'joinRoom';
  roomId: string;
  rtpCapabilities: types.RtpCapabilities;
}

interface LeaveRoomMessage extends BaseMessage {
  type: 'leaveRoom';
}

interface CreateTransportMessage extends BaseMessage {
  type: 'createTransport';
  direction: 'send' | 'recv';
}

interface ConnectTransportMessage extends BaseMessage {
  type: 'connectTransport';
  transportId: string;
  dtlsParameters: types.DtlsParameters;
}

interface ProduceMessage extends BaseMessage {
  type: 'produce';
  transportId: string;
  kind: 'audio' | 'video';
  rtpParameters: types.RtpParameters;
}

interface ConsumeMessage extends BaseMessage {
  type: 'consume';
  transportId: string;
  producerId: string;
  rtpCapabilities: types.RtpCapabilities;
}

interface ResumeConsumerMessage extends BaseMessage {
  type: 'resumeConsumer';
  consumerId: string;
}

interface PauseProducerMessage extends BaseMessage {
  type: 'pauseProducer';
  producerId: string;
}

interface ResumeProducerMessage extends BaseMessage {
  type: 'resumeProducer';
  producerId: string;
}

interface CloseProducerMessage extends BaseMessage {
  type: 'closeProducer';
  producerId: string;
}

type IncomingMsg =
  | AuthMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | CreateTransportMessage
  | ConnectTransportMessage
  | ProduceMessage
  | ConsumeMessage
  | ResumeConsumerMessage
  | PauseProducerMessage
  | ResumeProducerMessage
  | CloseProducerMessage;

// ─── Per-connection state ─────────────────────────────────────────────────────

interface PeerConnection {
  ws: WebSocket;
  peerId?: string;
  roomId?: string;
  authenticated: boolean;
}

// ─── Connection tracking for rate-limiting ────────────────────────────────────

const connectionsByIp = new Map<string, Set<WebSocket>>();

function trackConnection(ip: string, ws: WebSocket): boolean {
  let set = connectionsByIp.get(ip);
  if (!set) {
    set = new Set();
    connectionsByIp.set(ip, set);
  }
  if (set.size >= config.ws.maxConnectionsPerIp) {
    return false;
  }
  set.add(ws);
  return true;
}

function untrackConnection(ip: string, ws: WebSocket): void {
  const set = connectionsByIp.get(ip);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connectionsByIp.delete(ip);
}

// ─── Helper: send JSON ────────────────────────────────────────────────────────

function send(ws: WebSocket, payload: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendOk(ws: WebSocket, id: string | number | undefined, data: object): void {
  send(ws, { id, ok: true, ...data });
}

function sendError(ws: WebSocket, id: string | number | undefined, message: string): void {
  send(ws, { id, ok: false, error: message });
  metrics.signalingErrors.inc({ reason: message.slice(0, 40) });
}

// ─── Core handler ─────────────────────────────────────────────────────────────

async function handleMessage(conn: PeerConnection, msg: IncomingMsg): Promise<void> {
  const { ws } = conn;
  const { id, type } = msg;

  metrics.wsMessages.inc({ direction: 'in', type });

  // Auth must happen first
  if (type !== 'auth' && !conn.authenticated) {
    sendError(ws, id, 'Not authenticated');
    return;
  }

  try {
    switch (type) {
      case 'auth': {
        const payload = verifyToken(msg.token);
        conn.authenticated = true;
        conn.peerId = payload.sub;
        logger.info({ peerId: conn.peerId }, 'Peer authenticated');
        sendOk(ws, id, { peerId: conn.peerId });
        break;
      }

      case 'joinRoom': {
        if (!conn.peerId) throw new Error('No peerId');
        const room = await getOrCreateRoom(msg.roomId);
        conn.roomId = msg.roomId;
        room.addPeer(conn.peerId);

        // Notify about existing producers
        const existing = room.getOtherProducers(conn.peerId);
        sendOk(ws, id, {
          routerRtpCapabilities: room.routerRtpCapabilities,
          existingProducers: existing.map((e) => ({
            producerId: e.producer.id,
            peerId: e.peerId,
            kind: e.producer.kind,
          })),
        });
        break;
      }

      case 'leaveRoom': {
        if (!conn.peerId || !conn.roomId) break;
        const room = getRoom(conn.roomId);
        room?.removePeer(conn.peerId);
        conn.roomId = undefined;
        sendOk(ws, id, {});
        break;
      }

      case 'createTransport': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        if (!room) throw new Error('Room not found');
        const transport = await room.createWebRtcTransport(conn.peerId);
        sendOk(ws, id, {
          transportId: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        });
        break;
      }

      case 'connectTransport': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        if (!room) throw new Error('Room not found');
        await room.connectTransport(conn.peerId, msg.transportId, msg.dtlsParameters);
        sendOk(ws, id, {});
        break;
      }

      case 'produce': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        if (!room) throw new Error('Room not found');
        const producer = await room.produce(conn.peerId, msg.transportId, msg.rtpParameters, msg.kind);

        // Notify other peers about this new producer
        broadcastToRoom(conn.roomId, conn.peerId, {
          type: 'newProducer',
          producerId: producer.id,
          peerId: conn.peerId,
          kind: producer.kind,
        });

        producer.on('transportclose', () => {
          broadcastToRoom(conn.roomId!, conn.peerId!, {
            type: 'producerClosed',
            producerId: producer.id,
          });
        });

        sendOk(ws, id, { producerId: producer.id });
        break;
      }

      case 'consume': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        if (!room) throw new Error('Room not found');
        const consumer = await room.consume(
          conn.peerId,
          msg.transportId,
          msg.producerId,
          msg.rtpCapabilities,
        );
        sendOk(ws, id, {
          consumerId: consumer.id,
          producerId: msg.producerId,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
        });
        break;
      }

      case 'resumeConsumer': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        if (!room) throw new Error('Room not found');
        const peer = room.getPeer(conn.peerId);
        const consumer = peer?.consumers.get(msg.consumerId);
        if (!consumer) throw new Error('Consumer not found');
        await consumer.resume();
        sendOk(ws, id, {});
        break;
      }

      case 'pauseProducer': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        const peer = room?.getPeer(conn.peerId);
        const producer = peer?.producers.get(msg.producerId);
        if (!producer) throw new Error('Producer not found');
        await producer.pause();
        sendOk(ws, id, {});
        break;
      }

      case 'resumeProducer': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        const peer = room?.getPeer(conn.peerId);
        const producer = peer?.producers.get(msg.producerId);
        if (!producer) throw new Error('Producer not found');
        await producer.resume();
        sendOk(ws, id, {});
        break;
      }

      case 'closeProducer': {
        if (!conn.peerId || !conn.roomId) throw new Error('Not in a room');
        const room = getRoom(conn.roomId);
        const peer = room?.getPeer(conn.peerId);
        const producer = peer?.producers.get(msg.producerId);
        if (!producer) throw new Error('Producer not found');
        producer.close();
        peer!.producers.delete(msg.producerId);
        broadcastToRoom(conn.roomId, conn.peerId, {
          type: 'producerClosed',
          producerId: msg.producerId,
        });
        sendOk(ws, id, {});
        break;
      }

      default:
        sendError(ws, id, `Unknown message type`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ type, error: message }, 'Signaling error');
    sendError(ws, id, message);
  }
}

// ─── Broadcast helpers ─────────────────────────────────────────────────────────

// Map roomId -> Set of peer connections
export const roomConnections = new Map<string, Map<string, PeerConnection>>();

// All authenticated connections (for agent broadcasts)
const allConnections = new Set<WebSocket>();

function broadcastToRoom(roomId: string, excludePeerId: string, data: object): void {
  const connections = roomConnections.get(roomId);
  if (!connections) return;
  for (const [peerId, conn] of connections) {
    if (peerId === excludePeerId) continue;
    send(conn.ws, data);
    metrics.wsMessages.inc({ direction: 'out', type: (data as BaseMessage).type ?? 'unknown' });
  }
}

// ─── WebSocket server setup ───────────────────────────────────────────────────

export function attachSignalingServer(wss: WebSocketServer): void {  // Forward agent events to all authenticated WebSocket clients
  agentBus.on('agentEvent', (event: object) => {
    for (const ws of allConnections) {
      send(ws, event);
    }
  });
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? 'unknown';

    if (!trackConnection(ip, ws)) {
      logger.warn({ ip }, 'Connection limit exceeded; rejecting');
      ws.close(1008, 'Connection limit exceeded');
      return;
    }

    metrics.wsConnections.inc();
    const conn: PeerConnection = { ws, authenticated: false };
    allConnections.add(ws);
    logger.info({ ip }, 'WebSocket connected');

    ws.on('message', (raw) => {
      let msg: IncomingMsg;

      // Enforce max message size
      const rawStr = raw.toString();
      if (rawStr.length > config.ws.maxMessageBytes) {
        sendError(ws, undefined, 'Message too large');
        return;
      }

      try {
        msg = JSON.parse(rawStr) as IncomingMsg;
      } catch {
        sendError(ws, undefined, 'Invalid JSON');
        return;
      }

      // Register in room connection map when peer joins a room
      void handleMessage(conn, msg).then(() => {
        if (msg.type === 'joinRoom' && conn.peerId && conn.roomId) {
          let roomMap = roomConnections.get(conn.roomId);
          if (!roomMap) {
            roomMap = new Map();
            roomConnections.set(conn.roomId, roomMap);
          }
          roomMap.set(conn.peerId, conn);
        }
      });
    });

    ws.on('close', () => {
      metrics.wsConnections.dec();
      untrackConnection(ip, ws);
      allConnections.delete(ws);

      if (conn.peerId && conn.roomId) {
        const room = getRoom(conn.roomId);
        room?.removePeer(conn.peerId);

        const roomMap = roomConnections.get(conn.roomId);
        if (roomMap) {
          roomMap.delete(conn.peerId);
          if (roomMap.size === 0) roomConnections.delete(conn.roomId);
        }

        broadcastToRoom(conn.roomId, conn.peerId, {
          type: 'peerLeft',
          peerId: conn.peerId,
        });
      }
      logger.info({ ip, peerId: conn.peerId }, 'WebSocket disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ ip, error: err.message }, 'WebSocket error');
    });
  });
}
