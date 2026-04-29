/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.GOVERNANCE_BOOT.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = governance-boot — governed module
WHY = Wire the enforcement loop and guardians into the standards service initialization
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/governance/governance-boot.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

import { globalEnforcementLoop } from './runtime-enforcement-loop.js';
import {
  RuntimeChainGuardian,
  ContractIntegrityGuardian,
  ReceiptAuditGuardian,
  MemoryBoundaryGuardian,
  ExecutionCapabilityGuardian,
  createRuntimeGuardians,
} from './runtime-guardians.js';

export async function bootstrapGovernance(standardsService) {
  const guardians = await createRuntimeGuardians();

  globalEnforcementLoop.registerGuardian('runtime-chain', guardians.runtimeChain);
  globalEnforcementLoop.registerGuardian('contract-integrity', guardians.contractIntegrity);
  globalEnforcementLoop.registerGuardian('receipt-audit', guardians.receiptAudit);
  globalEnforcementLoop.registerGuardian('memory-boundary', guardians.memoryBoundary);
  globalEnforcementLoop.registerGuardian('execution-capability', guardians.executionCapability);

  if (standardsService?.contractIntegrity) {
    globalEnforcementLoop.setContractIntegrity(standardsService.contractIntegrity);
  }

  if (standardsService?.receiptAudit) {
    globalEnforcementLoop.setReceiptAudit(standardsService.receiptAudit);
  }

  globalEnforcementLoop.registerInterceptor('execution-gate', async (context) => {
    if (!context.module) {
      return { allowed: true };
    }

    if (!context.module.header || !context.module.header.includes('LEEWAY HEADER')) {
      return {
        allowed: false,
        reason: 'Module missing governance header',
        findings: [
          {
            severity: 'critical',
            message: 'Cannot execute module without LEEWAY HEADER',
          },
        ],
      };
    }

    return { allowed: true };
  });

  return globalEnforcementLoop;
}

export async function initializeGovernanceRuntime(options = {}) {
  const {
    standardsService,
    identityResolver,
    lock = true,
  } = options;

  await bootstrapGovernance(standardsService);

  if (identityResolver) {
    globalEnforcementLoop.setIdentityResolver(identityResolver);
  }

  globalEnforcementLoop.markBootstrapped();

  if (lock) {
    globalEnforcementLoop.lock();
  }

  return globalEnforcementLoop;
}

export function getGovernanceStatus() {
  return globalEnforcementLoop.getStatus();
}

export async function enforceExecution(context, handler) {
  if (!globalEnforcementLoop.getStatus().bootstrapped) {
    const error = new Error('Governance runtime not initialized. Call initializeGovernanceRuntime() first.');
    error.code = 'GOVERNANCE_NOT_INITIALIZED';
    throw error;
  }

  return globalEnforcementLoop.intercept(context, handler);
}
