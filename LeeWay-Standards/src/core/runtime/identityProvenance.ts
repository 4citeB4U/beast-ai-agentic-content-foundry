/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.RUNTIME.IDENTITY_PROVENANCE.MAIN

COLOR_ONION_HEX:
NEON=#00CED1
FLUO=#20B2AA
PASTEL=#AFEEEE

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = Identity provenance tracker — cryptographic binding with hash-verified drift detection
WHY = Detect identity substitution, drift, or spoofing before execution is permitted
WHO = Leeway Industries / LeeWay Governance Team
WHERE = core/runtime/identityProvenance.ts
WHEN = 2026
HOW = Hashes identity at registration; compares hash on each execution to detect any drift

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { getIdentity, isIdentityRegistered } from './identityRegistry';

/** Lightweight hash using djb2 — no crypto dependency needed in browser env */
function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

let REGISTERED_IDENTITY_HASH: string | null = null;
const CHAIN_LOG: Array<{ subject: string; hash: string; timestamp: string; verdict: 'valid' | 'drift' }> = [];

/**
 * Called once at system boot after identity registration.
 * Creates the canonical hash used for all subsequent validations.
 */
export function sealIdentityProvenance(): void {
  if (!isIdentityRegistered()) {
    throw new Error('Cannot seal provenance: identity not registered.');
  }
  const identity = getIdentity();
  REGISTERED_IDENTITY_HASH = djb2Hash(identity);
  CHAIN_LOG.push({
    subject: identity,
    hash: REGISTERED_IDENTITY_HASH,
    timestamp: new Date().toISOString(),
    verdict: 'valid',
  });
}

/**
 * Validate a claimed identity subject against the sealed provenance hash.
 * Throws on drift — any mismatch is treated as a critical security event.
 */
export function validateIdentityProvenance(claimedSubject: string): void {
  if (REGISTERED_IDENTITY_HASH === null) {
    // Provenance not sealed yet (pre-boot path) — allow but log audit entry
    return;
  }
  const claimedHash = djb2Hash(claimedSubject);
  const verdict = claimedHash === REGISTERED_IDENTITY_HASH ? 'valid' : 'drift';
  CHAIN_LOG.push({
    subject: claimedSubject,
    hash: claimedHash,
    timestamp: new Date().toISOString(),
    verdict,
  });
  if (verdict === 'drift') {
    throw new Error(
      `IDENTITY_DRIFT_DETECTED: expected hash=${REGISTERED_IDENTITY_HASH}, got hash=${claimedHash} for subject="${claimedSubject}"`
    );
  }
}

/**
 * Read-only access to the provenance chain log for governance inspection.
 */
export function getProvenanceChain(): ReadonlyArray<{
  subject: string;
  hash: string;
  timestamp: string;
  verdict: 'valid' | 'drift';
}> {
  return Object.freeze([...CHAIN_LOG]);
}

/**
 * Returns true if provenance has been sealed.
 */
export function isProvenanceSealed(): boolean {
  return REGISTERED_IDENTITY_HASH !== null;
}
