/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.SERVER
TAG: SFU.HTTP.WEBSOCKET.SERVER
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=network
5WH:
  WHAT = LeeWay SFU HTTP + WebSocket server with agent REST endpoints
  WHY  = Exposes /health, /metrics, /agents, /dev/token and WS signaling
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/server.ts
  WHEN = 2026
  HOW  = Express HTTP + ws.WebSocketServer + agentRegistry REST layer
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import http from 'http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { registry } from './metrics.js';
import { attachSignalingServer } from './signaling/handler.js';
import { issueToken } from './auth.js';
import { logger } from './logger.js';
import { config } from './config.js';
import { agentRegistry, agentRuntime, agentBus } from './agents/registry.js';

import { getRooms } from './mediasoup/room.js';
import { roomConnections } from './signaling/handler.js';

const LEEWAY_PREFIX = '-leeway23-';
const API_KEYS = new Set(['-leeway23-MISSION', '-leeway23-ADMIN9', '-leeway23-SDKE22']);
const BLACKLIST = new Set(['-leeway23-CORRUPT']);

function isValidKey(key: string) {
  if (!key || !key.startsWith(LEEWAY_PREFIX)) return false;
  if (key.length < 16) return false;
  if (BLACKLIST.has(key)) return false;
  return API_KEYS.has(key);
}

function authMiddleware(req: any, res: any, next: any) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!isValidKey(key)) {
    return res.status(401).json({ error: 'LeeWay ACCESS_DENIED: Invalid, Non-Compliant, or Revoked API Key. Codebase must pass LeeWay SDK Audit.' });
  }
  next();
}

export async function createServer(): Promise<http.Server> {
  const app = express();
  app.use(express.json());

  // Apply Auth to specific endpoints
  app.use('/agents', authMiddleware);
  app.use('/metrics', authMiddleware);

  // ─── Health ────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // ─── Metrics (Prometheus) ──────────────────────────────────────────────────
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  });

  // ─── Dev-only: issue a token ────────────────────────────────────────────────
  // In production, token issuance should live in a separate auth service.
  // This endpoint is gated by NODE_ENV so it's not accidentally exposed.
  if (process.env['NODE_ENV'] !== 'production') {
    app.post('/dev/token', (req, res) => {
      const sub = (req.body as { sub?: string }).sub ?? 'anonymous';
      const token = issueToken({ sub });
      res.json({ token });
    });
  }

  // ─── Agents REST ────────────────────────────────────────────────────────────
  app.get('/agents', (_req, res) => {
    res.json(agentRegistry.getAllSnapshots());
  });

  app.get('/agents/:codename', (req, res) => {
    const snap = agentRegistry.getSnapshot(req.params['codename'] ?? '');
    if (!snap) { res.status(404).json({ error: 'Agent not found' }); return; }
    res.json(snap);
  });

  // ─── Connections Monitoring ────────────────────────────────────────────────
  app.get('/connections', (_req, res) => {
    // roomConnections: Map<roomId, Map<peerId, PeerConnection>>
    const out: any[] = [];
    for (const [roomId, peers] of roomConnections.entries()) {
      for (const [peerId, conn] of peers.entries()) {
        out.push({
          roomId,
          peerId,
          authenticated: conn.authenticated,
          wsState: conn.ws.readyState,
        });
      }
    }
    res.json(out);
  });

  // ─── Rooms Monitoring ─────────────────────────────────────────────────────
  app.get('/rooms', (_req, res) => {
    const rooms = getRooms().map(r => ({
      id: r.id,
      peerCount: r.getPeerCount(),
      peers: Array.from(r.getPeers()).map(p => ({
        id: p.id,
        transports: Array.from(p.transports.keys()),
        producers: Array.from(p.producers.keys()),
        consumers: Array.from(p.consumers.keys()),
      })),
    }));
    res.json(rooms);
  });

  // Agent runtime status summary
  app.get('/agents/runtime/status', (_req, res) => {
    res.json(agentRuntime.getStatus());
  });

  // Suspend / resume directives (operator only — no public exposure)
  if (process.env['NODE_ENV'] !== 'production') {
    app.post('/agents/:codename/suspend', (req, res) => {
      const { codename } = req.params as { codename: string };
      const reason = (req.body as { reason?: string }).reason ?? 'operator request';
      const ok = agentRuntime.suspend(codename, reason);
      res.json({ ok, codename, reason });
    });
    app.post('/agents/:codename/resume', (req, res) => {
      const { codename } = req.params as { codename: string };
      const reason = (req.body as { reason?: string }).reason ?? 'operator request';
      const ok = agentRuntime.resume(codename, reason);
      res.json({ ok, codename, reason });
    });
  }

  const server = http.createServer(app);

  // ─── WebSocket ─────────────────────────────────────────────────────────────
  const wss = new WebSocketServer({ noServer: true });
  attachSignalingServer(wss);

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/ws') {
      const key = url.searchParams.get('apiKey');
      if (!isValidKey(key || '')) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\nLeeWay Signaling Error: Access Revoked or Non-Compliant.');
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(config.httpPort, () => {
    logger.info({ port: config.httpPort }, 'LeeWay SFU server listening');
    // Wire the bus broadcast to the runtime before starting agents
    agentRuntime.setBroadcast((event) => agentBus.broadcast(event));
    agentRegistry.startAll();
  });

  return server;
}
