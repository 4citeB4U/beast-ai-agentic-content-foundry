/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.RUNTIME_ENFORCEMENT_LOOP.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = runtime-enforcement-loop — governed module
WHY = Enforce LeeWay governance agents at runtime for all execution operations
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/governance/runtime-enforcement-loop.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const standardsRoot = path.resolve(__dirname, '../../../..');

const DISCOVERY_PIPELINE = 'Voice → Intent → Location → Vertical → Ranking → Render';

export class RuntimeEnforcementLoop {
  constructor() {
    this.interceptors = new Map();
    this.violations = [];
    this.receipts = [];
    this.guardians = new Map();
    this.contractIntegrity = null;
    this.receiptAudit = null;
    this.bootstrapped = false;
    this.locked = false;
    this.identityResolver = null;
  }

  assertMutable(operation) {
    if (this.locked) {
      throw new Error(`Governance is locked; cannot perform ${operation}`);
    }
  }

  assertBootstrapped() {
    if (!this.bootstrapped) {
      const error = new Error('Governance runtime is not bootstrapped. Execution denied.');
      error.code = 'GOVERNANCE_NOT_BOOTSTRAPPED';
      throw error;
    }
  }

  registerInterceptor(name, handler) {
    this.assertMutable('registerInterceptor');
    if (typeof handler !== 'function') {
      throw new TypeError(`Interceptor ${name} must be a function`);
    }
    this.interceptors.set(name, handler);
    return this;
  }

  registerGuardian(name, guardian) {
    this.assertMutable('registerGuardian');
    if (!guardian || typeof guardian.validate !== 'function') {
      throw new TypeError(`Guardian ${name} must have a validate method`);
    }
    this.guardians.set(name, guardian);
    return this;
  }

  setContractIntegrity(integrity) {
    this.assertMutable('setContractIntegrity');
    this.contractIntegrity = integrity;
    return this;
  }

  setReceiptAudit(audit) {
    this.assertMutable('setReceiptAudit');
    this.receiptAudit = audit;
    return this;
  }

  setIdentityResolver(resolver) {
    this.assertMutable('setIdentityResolver');
    if (resolver && typeof resolver !== 'function') {
      throw new TypeError('Identity resolver must be a function');
    }
    this.identityResolver = resolver;
    return this;
  }

  markBootstrapped() {
    this.bootstrapped = true;
    return this;
  }

  lock() {
    this.locked = true;
    return this;
  }

  async validateExecution(context) {
    this.assertBootstrapped();

    const result = {
      allowed: true,
      findings: [],
      receipts: [],
      violations: [],
      timestamp: new Date().toISOString(),
    };

    // Phase 0: Identity binding check (fail closed on drift)
    if (this.identityResolver) {
      try {
        const boundIdentity = await this.identityResolver(context);
        const claimedIdentity = context?.identity?.subject;
        if (!claimedIdentity) {
          result.allowed = false;
          result.violations.push({
            gate: 'identity-binding',
            reason: 'Execution identity is required but missing.',
            severity: 'critical',
          });
        } else if (boundIdentity && claimedIdentity !== boundIdentity) {
          result.allowed = false;
          result.violations.push({
            gate: 'identity-binding',
            reason: `Identity drift detected. claimed=${claimedIdentity}, bound=${boundIdentity}`,
            severity: 'critical',
          });
        }
      } catch (error) {
        result.allowed = false;
        result.violations.push({
          gate: 'identity-binding',
          reason: `Identity resolver failed: ${error.message}`,
          severity: 'error',
        });
      }
    }

    // Phase 1: Guardian pre-validation
    for (const [name, guardian] of this.guardians.entries()) {
      try {
        const validation = await guardian.validate(context);
        if (!validation.allowed) {
          result.allowed = false;
          result.violations.push({
            gate: name,
            reason: validation.reason || 'Guardian blocked execution',
            severity: validation.severity || 'critical',
          });
        }
        if (validation.findings) {
          result.findings.push(...validation.findings.map((f) => ({ source: name, ...f })));
        }
      } catch (error) {
        result.violations.push({
          gate: name,
          reason: `Guardian error: ${error.message}`,
          severity: 'error',
        });
        result.allowed = false;
      }
    }

    // Phase 2: Contract integrity check
    if (this.contractIntegrity && context.module) {
      try {
        const integrity = await this.contractIntegrity.validate(context.module);
        if (!integrity.valid) {
          result.allowed = false;
          result.violations.push({
            gate: 'contract-integrity',
            reason: 'Module does not meet contractual requirements',
            details: integrity.issues,
            severity: 'critical',
          });
        }
        result.receipts.push({
          validator: 'contract-integrity',
          status: integrity.valid ? 'passed' : 'failed',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        result.violations.push({
          gate: 'contract-integrity',
          reason: `Integrity check failed: ${error.message}`,
          severity: 'error',
        });
        result.allowed = false;
      }
    }

    // Phase 3: Run registered interceptors
    for (const [name, interceptor] of this.interceptors.entries()) {
      try {
        const interceptorResult = await interceptor(context);
        if (interceptorResult && !interceptorResult.allowed) {
          result.allowed = false;
          result.violations.push({
            gate: name,
            reason: interceptorResult.reason || 'Interceptor blocked',
            severity: 'critical',
          });
        }
        if (interceptorResult?.findings) {
          result.findings.push(...interceptorResult.findings.map((f) => ({ source: name, ...f })));
        }
      } catch (error) {
        result.violations.push({
          gate: name,
          reason: `Interceptor error: ${error.message}`,
          severity: 'error',
        });
        result.allowed = false;
      }
    }

    // Phase 4: Emit receipt
    if (this.receiptAudit) {
      try {
        await this.receiptAudit.log({
          type: 'execution-enforcement',
          context,
          result,
          timestamp: result.timestamp,
        });
      } catch (error) {
        console.error('Receipt audit failed:', error.message);
      }
    }

    return result;
  }

  async intercept(context, handler) {
    this.assertBootstrapped();

    if (!handler || typeof handler !== 'function') {
      throw new TypeError('Handler must be a function');
    }

    const validation = await this.validateExecution(context);

    if (!validation.allowed) {
      const error = new Error('Execution blocked by governance enforcement');
      error.code = 'ENFORCEMENT_BLOCKED';
      error.violations = validation.violations;
      error.findings = validation.findings;
      throw error;
    }

    try {
      return await handler();
    } catch (error) {
      if (this.receiptAudit) {
        try {
          await this.receiptAudit.log({
            type: 'execution-error',
            context,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        } catch (auditError) {
          console.error('Failed to log execution error:', auditError.message);
        }
      }
      throw error;
    }
  }

  getStatus() {
    return {
      guardians: Array.from(this.guardians.keys()),
      interceptors: Array.from(this.interceptors.keys()),
      violations: this.violations.length,
      receipts: this.receipts.length,
      contractIntegrityActive: !!this.contractIntegrity,
      receiptAuditActive: !!this.receiptAudit,
      bootstrapped: this.bootstrapped,
      locked: this.locked,
      identityBindingActive: !!this.identityResolver,
    };
  }
}

export const globalEnforcementLoop = new RuntimeEnforcementLoop();

export async function createEnforcementLoop() {
  return new RuntimeEnforcementLoop();
}
