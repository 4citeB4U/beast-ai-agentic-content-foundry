/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CORE.LEGACY.SECURE
TAG: CORE.INTERNAL.MODULE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=lock
5WH:
  WHAT = Migrated LeeWay SFU Internal Logic
  WHY  = Ensures baseline architectural compliance with the Living Organism integrity guard
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/
  WHEN = 2026
  HOW  = Governance Patch v43.4
AGENTS: AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import os from 'os';

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function intEnv(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

export const config = {
  httpPort: intEnv('HTTP_PORT', 3000),
  jwtSecret: requireEnv('JWT_SECRET', 'change_me_in_production'),
  logLevel: requireEnv('LOG_LEVEL', 'info'),

  mediasoup: {
    numWorkers: intEnv('MEDIASOUP_NUM_WORKERS', os.cpus().length),
    rtcMinPort: intEnv('RTC_MIN_PORT', 40000),
    rtcMaxPort: intEnv('RTC_MAX_PORT', 49999),
    announcedIp: process.env['ANNOUNCED_IP'] || undefined,

    /**
     * mediasoup router media codecs.
     * Supports VP8 (with simulcast), VP9, H264 and Opus.
     */
    routerMediaCodecs: [
      {
        kind: 'audio' as const,
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
        parameters: {
          minptime: 10,
          useinbandfec: 1,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {},
      },
      {
        kind: 'video' as const,
        mimeType: 'video/VP9',
        clockRate: 90000,
        parameters: {
          'profile-id': 2,
        },
      },
      {
        kind: 'video' as const,
        mimeType: 'video/h264',
        clockRate: 90000,
        parameters: {
          'packetization-mode': 1,
          'profile-level-id': '4d0032',
          'level-asymmetry-allowed': 1,
        },
      },
    ],
  },

  ws: {
    maxConnectionsPerIp: intEnv('WS_MAX_CONNECTIONS_PER_IP', 10),
    maxMessageBytes: intEnv('WS_MAX_MESSAGE_BYTES', 65536),
  },
} as const;
