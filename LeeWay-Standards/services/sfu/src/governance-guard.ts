/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CORE.GOVERNANCE.GUARD
TAG: CORE.SYSTEM.INTEGRITY.PROTECTOR
COLOR_ONION_HEX: NEON=#FF0000 FLUO=#FF5F00 PASTEL=#FFD8D8
ICON_ASCII: family=lucide glyph=shield-alert
5WH:
  WHAT = Code Integrity & Anti-Corruption Guard
  WHY  = Ensures that LeeWay Standards are never 'rinsed' or removed. If standards are missing, the system breaks.
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = services/sfu/src/governance-guard.ts
  WHEN = 2026
  HOW  = Recursive scan of src files for the LeeWay Header pattern using Regex.
AGENTS: AUDIT ALIGN
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import fs from 'fs';
import path from 'path';
import { logger } from './logger.js';

const MANDATORY_PATTERN = /LEEWAY HEADER — DO NOT REMOVE/;
const REGIONS_OF_INTEREST = ['src', 'services/sfu/src'];

export function enforceLivingOrganism(rootPath: string) {
  logger.info({ rootPath }, 'INITIATING_GOVERNANCE_INTEGRITY_SCAN');
  
  let violationCount = 0;

  function scanDir(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          scanDir(fullPath);
        }
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (!MANDATORY_PATTERN.test(content)) {
          logger.error({ file: entry.name, path: fullPath }, 'GOVERNANCE_VIOLATION: LeeWay Header Missing or "Rinsed"');
          violationCount++;
        }
      }
    }
  }

  try {
    for (const region of REGIONS_OF_INTEREST) {
      const target = path.isAbsolute(region) ? region : path.join(rootPath, region);
      if (fs.existsSync(target)) {
        scanDir(target);
      }
    }

    if (violationCount > 0) {
      console.error(`\n\x1b[41m\x1b[37m CRITICAL SYSTEM ERROR: CODEBASE CORRUPTION DETECTED \x1b[0m`);
      console.error(`\x1b[31mLeeWay Governance Guard found ${violationCount} files missing the mandatory LeeWay Header.\x1b[0m`);
      console.error(`\x1b[31mAccess Revoked. System is breaking to protect IP integrity.\x1b[0m\n`);
      process.exit(99); // Exit with unique 'Poison Pill' code
    }

    logger.info('GOVERNANCE_AUDIT_PASSED: All files compliant with LEEWAY INDUSTRIES Standards.');
  } catch (err) {
    logger.error({ err }, 'GOVERNANCE_SCAN_FAILED: Possible sabotage attempt detected.');
    process.exit(500);
  }
}
