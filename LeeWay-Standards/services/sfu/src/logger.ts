/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: SFU.LOGGER
TAG: SFU.LOGGING.CENTRAL
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=file-text
5WH:
  WHAT = LeeWay centralized logger — all agents + system write to unified /logs/ directory
  WHY  = Single log directory enables tailing, rotation, shipping, and forensic audits
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/logger.ts
  WHEN = 2026
  HOW  = pino multistream → stdout + logs/combined.log; agentLogger() creates per-agent
         child loggers that ALSO append to logs/<codename>.log
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections

import pino from 'pino';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';

// ─── Ensure logs/ directory exists (relative to CWD = services/sfu/) ─────────
const LOGS_DIR = join(process.cwd(), 'logs');
mkdirSync(LOGS_DIR, { recursive: true });

const BASE_OPTIONS: pino.LoggerOptions = {
  level: config.logLevel,
  formatters: { level(label) { return { level: label }; } },
  timestamp: pino.stdTimeFunctions.isoTime,
};

/** System-level logger — writes to stdout AND logs/combined.log */
export const logger = pino(
  BASE_OPTIONS,
  pino.multistream([
    { stream: process.stdout },
    { stream: createWriteStream(join(LOGS_DIR, 'combined.log'), { flags: 'a' }) },
  ]),
);

/**
 * Per-agent logger — writes to stdout, logs/combined.log, AND logs/<codename>.log
 * Use this inside every agent's tick() and lifecycle methods.
 */
export function agentLogger(codename: string): pino.Logger {
  const agentFile = join(LOGS_DIR, `${codename.toLowerCase()}.log`);
  return pino(
    { ...BASE_OPTIONS, base: { agent: codename } },
    pino.multistream([
      { stream: process.stdout },
      { stream: createWriteStream(join(LOGS_DIR, 'combined.log'), { flags: 'a' }) },
      { stream: createWriteStream(agentFile, { flags: 'a' }) },
    ]),
  );
}

export { LOGS_DIR };
