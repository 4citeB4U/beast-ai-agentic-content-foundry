/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.RUNTIME.IDENTITY_REGISTRY.MAIN

COLOR_ONION_HEX:
NEON=#9400D3
FLUO=#8B00FF
PASTEL=#E6CCFF

ICON_ASCII:
family=lucide
glyph=fingerprint

5WH:
WHAT = Singleton identity registry — stores and enforces the bound system identity at runtime
WHY = Prevent identity fragmentation, impersonation, and drift across agents and projections
WHO = Leeway Industries / LeeWay Governance Team
WHERE = core/runtime/identityRegistry.ts
WHEN = 2026
HOW = Single-write identity slot; any mutation after bind throws IDENTITY_ALREADY_BOUND

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

let SYSTEM_IDENTITY: string | null = null;
let IDENTITY_BOUND_AT: string | null = null;
const IDENTITY_ROLE_MAP = new Map<string, string>();

/**
 * Bind the system identity once at boot. Throws if called a second time.
 */
export function registerIdentity(identity: string, role: string = 'system'): void {
  if (SYSTEM_IDENTITY !== null) {
    throw new Error('IDENTITY_ALREADY_BOUND: System identity has already been registered.');
  }
  SYSTEM_IDENTITY = identity;
  IDENTITY_BOUND_AT = new Date().toISOString();
  IDENTITY_ROLE_MAP.set(identity, role);
}

/**
 * Retrieve the bound identity. Throws if not yet registered.
 */
export function getIdentity(): string {
  if (SYSTEM_IDENTITY === null) {
    throw new Error('IDENTITY_NOT_BOUND: System identity has not been registered.');
  }
  return SYSTEM_IDENTITY;
}

/**
 * Check whether an identity subject matches the registered system identity.
 */
export function verifyIdentity(subject: string): boolean {
  return SYSTEM_IDENTITY !== null && subject === SYSTEM_IDENTITY;
}

/**
 * Get role for a registered identity.
 */
export function getIdentityRole(subject: string): string | null {
  return IDENTITY_ROLE_MAP.get(subject) ?? null;
}

/**
 * Returns whether the registry has been initialized.
 */
export function isIdentityRegistered(): boolean {
  return SYSTEM_IDENTITY !== null;
}

/**
 * Read-only snapshot for governance inspection.
 */
export function getIdentitySnapshot(): { subject: string; role: string; boundAt: string } | null {
  if (!SYSTEM_IDENTITY || !IDENTITY_BOUND_AT) return null;
  return {
    subject: SYSTEM_IDENTITY,
    role: IDENTITY_ROLE_MAP.get(SYSTEM_IDENTITY) ?? 'unknown',
    boundAt: IDENTITY_BOUND_AT,
  };
}
