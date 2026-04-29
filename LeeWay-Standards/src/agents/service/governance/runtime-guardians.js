/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.MODULE.RUNTIME_GUARDIANS.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = runtime-guardians — governed module
WHY = Enforce architectural sovereignty and standards boundaries during execution
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = src/agents/service/governance/runtime-guardians.js
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/

export class RuntimeChainGuardian {
  constructor() {
    this.name = 'RuntimeChainGuardian';
    this.violations = [];
  }

  async validate(context) {
    const findings = [];
    const allowed = true;

    if (context.importPath) {
      const forbidden = ['/runtime/', '/standards/', '/core/'];
      for (const pattern of forbidden) {
        if (context.importPath.includes(pattern) && context.type === 'projection') {
          findings.push({
            severity: 'critical',
            message: `Projections cannot import from ${pattern}. Use the adapter pattern instead.`,
          });
        }
      }
    }

    if (context.module && context.module.overwrites) {
      for (const overwrite of context.module.overwrites) {
        if (['runtime', 'standards', 'core'].includes(overwrite.target)) {
          findings.push({
            severity: 'critical',
            message: `Module cannot overwrite ${overwrite.target} layer. Sovereignty boundary violated.`,
          });
        }
      }
    }

    return {
      allowed: findings.filter((f) => f.severity === 'critical').length === 0 || allowed,
      findings,
      reason: findings.length > 0 ? 'Sovereignty boundary violation' : null,
    };
  }
}

export class ContractIntegrityGuardian {
  constructor() {
    this.name = 'ContractIntegrityGuardian';
  }

  async validate(context) {
    const findings = [];

    if (context.module) {
      if (!context.module.header || !context.module.header.includes('LEEWAY HEADER')) {
        findings.push({
          severity: 'critical',
          message: 'Module missing LEEWAY HEADER. Cannot proceed.',
        });
      }

      if (!context.module.tag) {
        findings.push({
          severity: 'critical',
          message: 'Module missing TAG metadata. Cannot identify module governance.',
        });
      }

      if (!context.module.region) {
        findings.push({
          severity: 'high',
          message: 'Module missing REGION designation. Use CORE, UI, UTIL, or DATA.',
        });
      }

      if (!context.module.discoveryPipeline || !context.module.discoveryPipeline.includes('Voice')) {
        findings.push({
          severity: 'high',
          message: 'Module does not follow the LeeWay discovery pipeline.',
        });
      }
    }

    return {
      allowed: findings.filter((f) => f.severity === 'critical').length === 0,
      findings,
      reason: findings.filter((f) => f.severity === 'critical').length > 0 ? 'Integrity check failed' : null,
    };
  }
}

export class ReceiptAuditGuardian {
  constructor() {
    this.name = 'ReceiptAuditGuardian';
  }

  async validate(context) {
    const findings = [];

    if (context.type === 'projection' || context.type === 'extension') {
      if (!context.module?.emitsReceipts) {
        findings.push({
          severity: 'high',
          message: 'External modules must emit execution receipts for audit trail.',
        });
      }

      if (!context.module?.exposesHealthState) {
        findings.push({
          severity: 'high',
          message: 'External modules must expose health state for monitoring.',
        });
      }

      if (!context.module?.exposesAuditHooks) {
        findings.push({
          severity: 'high',
          message: 'External modules must expose audit hooks for governance.',
        });
      }
    }

    return {
      allowed: true,
      findings,
      reason: null,
    };
  }
}

export class MemoryBoundaryGuardian {
  constructor() {
    this.name = 'MemoryBoundaryGuardian';
  }

  async validate(context) {
    const findings = [];

    if (context.type === 'projection' && context.module) {
      const forbiddenAccess = [
        'standards::internal',
        'runtime::state',
        'core::registry',
        'governance::decisions',
      ];

      if (context.module.accessPatterns) {
        for (const pattern of context.module.accessPatterns) {
          if (forbiddenAccess.includes(pattern)) {
            findings.push({
              severity: 'critical',
              message: `Projection cannot access ${pattern}. Memory boundary violated.`,
            });
          }
        }
      }
    }

    return {
      allowed: findings.filter((f) => f.severity === 'critical').length === 0,
      findings,
      reason: findings.filter((f) => f.severity === 'critical').length > 0 ? 'Memory boundary violation' : null,
    };
  }
}

export class ExecutionCapabilityGuardian {
  constructor() {
    this.name = 'ExecutionCapabilityGuardian';
  }

  async validate(context) {
    const findings = [];

    if (context.operation === 'file-system-write' && context.type === 'projection') {
      findings.push({
        severity: 'high',
        message: 'Projections have limited file-system access. Routes through governance layer.',
      });
    }

    if (context.operation === 'network-request' && !context.module?.approvedDomains) {
      findings.push({
        severity: 'high',
        message: 'Network operations require approved domain whitelist.',
      });
    }

    if (context.operation === 'spawn-agent' && !context.module?.agentSpawnCapability) {
      findings.push({
        severity: 'critical',
        message: 'Module is not authorized to spawn agents.',
      });
    }

    return {
      allowed: findings.filter((f) => f.severity === 'critical').length === 0,
      findings,
      reason: findings.filter((f) => f.severity === 'critical').length > 0 ? 'Capability check failed' : null,
    };
  }
}

export async function createRuntimeGuardians() {
  return {
    runtimeChain: new RuntimeChainGuardian(),
    contractIntegrity: new ContractIntegrityGuardian(),
    receiptAudit: new ReceiptAuditGuardian(),
    memoryBoundary: new MemoryBoundaryGuardian(),
    executionCapability: new ExecutionCapabilityGuardian(),
  };
}
