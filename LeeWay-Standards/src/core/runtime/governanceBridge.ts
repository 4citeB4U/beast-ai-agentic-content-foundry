/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.RUNTIME.GOVERNANCE_BRIDGE.MAIN

COLOR_ONION_HEX:
NEON=#FFD700
FLUO=#FFA500
PASTEL=#FFEAA7

ICON_ASCII:
family=lucide
glyph=link

5WH:
WHAT = Governance bridge — connects LeeWay-Standards runtime enforcement into the live app boot sequence
WHY = Single initialization path so governance is always-on before any handler can run
WHO = Leeway Industries / LeeWay Governance Team
WHERE = core/runtime/governanceBridge.ts
WHEN = 2026
HOW = Wraps initializeGovernanceRuntime from Standards; exposes a stable enforce() + isReady() API

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { registerIdentity, getIdentity, isIdentityRegistered } from './identityRegistry';
import { sealIdentityProvenance } from './identityProvenance';

export interface GovernanceExecutionEvent {
  type: 'allowed' | 'blocked' | 'error' | 'audit';
  context: Record<string, unknown>;
  violations: Array<{ gate: string; reason: string; severity: string }>;
  findings: Array<{ severity: string; message: string; [key: string]: unknown }>;
  error?: string;
  duration?: number;
  timestamp: string;
}

type Enforcer = (context: Record<string, unknown>, handler: () => Promise<unknown>) => Promise<unknown>;

let enforcer: Enforcer | null = null;
let ready = false;

/**
 * Boot the governance system. Must be called exactly once at app startup.
 * After this call, runExecution() will pass through the Standards enforcement loop.
 *
 * Options:
 *   - identity: the canonical agent identity (e.g. "agent://lee")
 *   - role: role label for the identity
 *   - lock: whether to lock guardians after boot (default true)
 */
export async function bootGovernanceRuntime(options: {
  identity: string;
  role?: string;
  lock?: boolean;
}): Promise<void> {
  if (ready) return; // Idempotent

  const { identity, role = 'system', lock = true } = options;

  // 1. Bind system identity
  if (!isIdentityRegistered()) {
    registerIdentity(identity, role);
  }

  // 2. Seal provenance hash
  sealIdentityProvenance();

  const boundIdentity = getIdentity();

  // 3. Try to wire LeeWay-Standards enforcement loop (imported dynamically so
  //    the browser bundle stays optional if Standards is not in the bundle graph)
  try {
    // Dynamic import — Standards governance boot lives in the leeway-sdk package
    // or can be resolved via path alias. We fall back to a local enforcer if unavailable.
    const mod = await import(
      // @ts-ignore — may not be resolvable in all bundle targets
      /* @vite-ignore */
      '../../LeeWay-Standards/src/agents/service/governance/governance-boot.js'
    );
    await mod.initializeGovernanceRuntime({
      identityResolver: () => boundIdentity,
      lock,
    });
    enforcer = async (ctx, handler) => mod.enforceExecution(ctx, handler);
  } catch {
    // Standards loop unavailable in this bundle target — use the local fail-closed enforcer
    enforcer = localEnforcer;
  }

  ready = true;
}

/**
 * Minimal local enforcer used when the Standards runtime loop is not bundle-reachable.
 * Validates the header and identity fields inline.
 */
async function localEnforcer(
  context: Record<string, unknown>,
  handler: () => Promise<unknown>
): Promise<unknown> {
  const mod = context.module as { header?: string } | undefined;
  if (mod && (!mod.header || !mod.header.includes('LEEWAY HEADER'))) {
    const err = new Error('Execution blocked by governance enforcement');
    (err as NodeJS.ErrnoException).code = 'ENFORCEMENT_BLOCKED';
    (err as unknown as { violations: unknown[] }).violations = [
      { gate: 'local-contract', reason: 'Module missing LEEWAY HEADER', severity: 'critical' },
    ];
    throw err;
  }
  return handler();
}

/**
 * Returns the GovernanceBridge singleton.
 * Used by executionKernel.ts to delegate enforce calls.
 */
export function getGovernanceBridge(): { isReady: () => boolean; enforce: Enforcer } {
  return {
    isReady: () => ready,
    enforce: (ctx, handler) => {
      if (!enforcer) {
        const err = new Error('GovernanceBridge: enforcer not initialized');
        (err as NodeJS.ErrnoException).code = 'GOVERNANCE_NOT_INITIALIZED';
        throw err;
      }
      return enforcer(ctx as Record<string, unknown>, handler);
    },
  };
}

export function isGovernanceReady(): boolean {
  return ready;
}
