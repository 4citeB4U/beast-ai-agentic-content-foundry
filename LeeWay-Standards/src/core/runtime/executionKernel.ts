/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards

REGION: CORE
TAG: CORE.RUNTIME.EXECUTION_KERNEL.MAIN

COLOR_ONION_HEX:
NEON=#FF4500
FLUO=#FF6347
PASTEL=#FFDAB9

ICON_ASCII:
family=lucide
glyph=cpu

5WH:
WHAT = Central execution kernel — ALL agent and UI actions pass through this gate
WHY = Enforce governance compliance on every execution path; fail closed without governance
WHO = Leeway Industries / LeeWay Governance Team
WHERE = core/runtime/executionKernel.ts
WHEN = 2026
HOW = Wraps every action in enforceExecution(); publishes execution events to GovernanceBrain

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import type { GovernanceExecutionEvent } from './governanceBridge';
import { getGovernanceBridge } from './governanceBridge';
import { getIdentity } from './identityRegistry';
import { validateIdentityProvenance } from './identityProvenance';

export interface ExecutionContext {
  type: 'message' | 'agent' | 'dispatch' | 'projection' | 'extension' | 'core';
  operation?: string;
  module?: {
    header?: string;
    tag?: string;
    region?: string;
    discoveryPipeline?: string;
    emitsReceipts?: boolean;
    exposesHealthState?: boolean;
    exposesAuditHooks?: boolean;
    approvedDomains?: string[];
    agentSpawnCapability?: boolean;
    accessPatterns?: string[];
    overwrites?: Array<{ target: string }>;
  };
  identity?: {
    subject: string;
    role?: string;
  };
  importPath?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionResult<T = unknown> {
  result: T;
  allowed: boolean;
  violations: Array<{ gate: string; reason: string; severity: string }>;
  findings: Array<{ severity: string; message: string }>;
  duration: number;
  timestamp: string;
}

export type ExecutionEventListener = (event: GovernanceExecutionEvent) => void;

const listeners: ExecutionEventListener[] = [];

export function subscribeExecutionEvents(listener: ExecutionEventListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}

function emitExecutionEvent(event: GovernanceExecutionEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Listener failures must not block execution
    }
  }
}

/**
 * Primary execution gate. ALL agent/UI/dispatch operations must pass through here.
 * If governance is not initialized → throws immediately (fail closed).
 * If validation fails → throws with violation details.
 */
export async function runExecution<T = unknown>(
  rawContext: ExecutionContext,
  handler: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const bridge = getGovernanceBridge();

  // Attach system identity to every execution context
  let context = { ...rawContext };
  if (!context.identity) {
    try {
      const systemId = getIdentity();
      context = { ...context, identity: { subject: systemId } };
    } catch {
      // If identity is not registered yet (pre-boot path), let governance decide
    }
  }

  // Validate identity provenance — blocks drift
  if (context.identity) {
    try {
      validateIdentityProvenance(context.identity.subject);
    } catch (err: unknown) {
      const driftErr = new Error(`Identity provenance failure: ${(err as Error).message}`);
      (driftErr as NodeJS.ErrnoException).code = 'IDENTITY_PROVENANCE_FAILED';
      emitExecutionEvent({
        type: 'blocked',
        context,
        violations: [{ gate: 'identity-provenance', reason: (err as Error).message, severity: 'critical' }],
        findings: [],
        timestamp: new Date().toISOString(),
      });
      throw driftErr;
    }
  }

  if (!bridge.isReady()) {
    const err = new Error(
      'Execution kernel: Governance bridge not ready. Call bootGovernanceRuntime() before executing.'
    );
    (err as NodeJS.ErrnoException).code = 'GOVERNANCE_NOT_READY';
    emitExecutionEvent({
      type: 'blocked',
      context,
      violations: [{ gate: 'governance-boot', reason: 'Governance not initialized', severity: 'critical' }],
      findings: [],
      timestamp: new Date().toISOString(),
    });
    throw err;
  }

  try {
    const enforceResult = await bridge.enforce(context, async () => {
      return await handler();
    });

    emitExecutionEvent({
      type: 'allowed',
      context,
      violations: [],
      findings: [],
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
    });

    return enforceResult as T;
  } catch (err: unknown) {
    const errCode = (err as NodeJS.ErrnoException).code;
    const violations = (err as { violations?: Array<{gate:string;reason:string;severity:string}> }).violations ?? [];
    const findings = (err as { findings?: Array<{severity:string;message:string}> }).findings ?? [];

    const isEnforcementBlock = errCode === 'ENFORCEMENT_BLOCKED' || errCode === 'GOVERNANCE_NOT_INITIALIZED';

    emitExecutionEvent({
      type: isEnforcementBlock ? 'blocked' : 'error',
      context,
      violations,
      findings,
      error: (err as Error).message,
      duration: Date.now() - start,
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}

/**
 * Fire-and-forget audit wrap. Non-blocking governance record for read-only paths.
 */
export function auditExecution(context: ExecutionContext): void {
  emitExecutionEvent({
    type: 'audit',
    context,
    violations: [],
    findings: [],
    timestamp: new Date().toISOString(),
  });
}
