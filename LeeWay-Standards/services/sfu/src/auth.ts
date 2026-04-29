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

import jwt from 'jsonwebtoken';
import { config } from './config.js';

export interface JwtPayload {
  sub: string;
  roomId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify a JWT token and return its payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}

/**
 * Issue a JWT token (useful for dev/testing; production should use a
 * separate auth service to sign tokens).
 */
export function issueToken(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn = '8h'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload as any, config.jwtSecret, { expiresIn } as any);
}
