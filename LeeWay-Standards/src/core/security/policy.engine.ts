/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SECURITY.POLICY_ENGINE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = policy.engine.ts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = LeeWay-Standards/src/core/security/policy.engine.ts
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * POLICY ENGINE MODULE
 * 
 * Manages security policy levels and enforcement behavior.
 * Allows runtime to adapt enforcement based on context:
 * - Normal users: strict enforcement
 * - Creator in recovery: relaxed enforcement with logging
 * 
 * Policies are separate from code, so they can be changed without redeployment.
 */

export enum PolicyMode {
  STRICT = 'strict',
  BALANCED = 'balanced',
  RELAXED = 'relaxed',
  RECOVERY = 'recovery'
}

export enum MismatchAction {
  BLOCK = 'block',
  WARN = 'warn',
  QUARANTINE = 'quarantine',
  REPAIR = 'repair'
}

/**
 * Defines security policy and enforcement rules
 * Can be modified by creator in privileged mode
 */
export interface SecurityPolicy {
  mode: PolicyMode;
  
  // Integrity enforcement
  integrityRequired: boolean;
  auditRequired: boolean;
  signatureRotationRequired: boolean;
  
  // Creator authority
  creatorOverrideEnabled: boolean;
  creatorCanBypassIntegrity: boolean;
  creatorCanRepairSignatures: boolean;
  
  // Lockout behavior
  autoLockoutOnMismatch: boolean;
  mismatchAction: MismatchAction;
  maxMismatchesBeforeQuarantine: number;
  quarantineDurationMs: number;
  
  // Recovery behavior
  recoveryModeEnabled: boolean;
  recoveryTimeoutMs: number;
  allowEmergencyUnlock: boolean;
  
  // Logging
  logAllSignatureChecks: boolean;
  logAllOverrides: boolean;
  logAllRecoveryAttempts: boolean;
  
  // Audit trail
  auditTrailImmutable: boolean;
  auditTrailRetentionMs: number;
  
  version: number;
  lastModifiedAt: number;
  modifiedBy: string;
}

/**
 * Default policies for different contexts
 */
const DEFAULT_POLICIES: Record<PolicyMode, SecurityPolicy> = {
  [PolicyMode.STRICT]: {
    mode: PolicyMode.STRICT,
    integrityRequired: true,
    auditRequired: true,
    signatureRotationRequired: true,
    creatorOverrideEnabled: false,
    creatorCanBypassIntegrity: false,
    creatorCanRepairSignatures: false,
    autoLockoutOnMismatch: true,
    mismatchAction: MismatchAction.BLOCK,
    maxMismatchesBeforeQuarantine: 3,
    quarantineDurationMs: 3600000,
    recoveryModeEnabled: false,
    recoveryTimeoutMs: 0,
    allowEmergencyUnlock: false,
    logAllSignatureChecks: false,
    logAllOverrides: false,
    logAllRecoveryAttempts: false,
    auditTrailImmutable: true,
    auditTrailRetentionMs: 86400000 * 90, // 90 days
    version: 1,
    lastModifiedAt: Date.now(),
    modifiedBy: 'system'
  },

  [PolicyMode.BALANCED]: {
    mode: PolicyMode.BALANCED,
    integrityRequired: true,
    auditRequired: true,
    signatureRotationRequired: false,
    creatorOverrideEnabled: true,
    creatorCanBypassIntegrity: false,
    creatorCanRepairSignatures: true,
    autoLockoutOnMismatch: false,
    mismatchAction: MismatchAction.QUARANTINE,
    maxMismatchesBeforeQuarantine: 5,
    quarantineDurationMs: 1800000,
    recoveryModeEnabled: true,
    recoveryTimeoutMs: 600000,
    allowEmergencyUnlock: true,
    logAllSignatureChecks: true,
    logAllOverrides: true,
    logAllRecoveryAttempts: true,
    auditTrailImmutable: true,
    auditTrailRetentionMs: 86400000 * 90,
    version: 1,
    lastModifiedAt: Date.now(),
    modifiedBy: 'system'
  },

  [PolicyMode.RELAXED]: {
    mode: PolicyMode.RELAXED,
    integrityRequired: true,
    auditRequired: true,
    signatureRotationRequired: false,
    creatorOverrideEnabled: true,
    creatorCanBypassIntegrity: true,
    creatorCanRepairSignatures: true,
    autoLockoutOnMismatch: false,
    mismatchAction: MismatchAction.WARN,
    maxMismatchesBeforeQuarantine: 10,
    quarantineDurationMs: 600000,
    recoveryModeEnabled: true,
    recoveryTimeoutMs: 300000,
    allowEmergencyUnlock: true,
    logAllSignatureChecks: true,
    logAllOverrides: true,
    logAllRecoveryAttempts: true,
    auditTrailImmutable: false,
    auditTrailRetentionMs: 86400000 * 30,
    version: 1,
    lastModifiedAt: Date.now(),
    modifiedBy: 'system'
  },

  [PolicyMode.RECOVERY]: {
    mode: PolicyMode.RECOVERY,
    integrityRequired: false,
    auditRequired: true,
    signatureRotationRequired: false,
    creatorOverrideEnabled: true,
    creatorCanBypassIntegrity: true,
    creatorCanRepairSignatures: true,
    autoLockoutOnMismatch: false,
    mismatchAction: MismatchAction.REPAIR,
    maxMismatchesBeforeQuarantine: 999,
    quarantineDurationMs: 0,
    recoveryModeEnabled: true,
    recoveryTimeoutMs: 1800000,
    allowEmergencyUnlock: true,
    logAllSignatureChecks: true,
    logAllOverrides: true,
    logAllRecoveryAttempts: true,
    auditTrailImmutable: true,
    auditTrailRetentionMs: 86400000 * 180,
    version: 1,
    lastModifiedAt: Date.now(),
    modifiedBy: 'system'
  }
};

/**
 * Manages security policies
 */
export class PolicyEngine {
  private currentPolicy: SecurityPolicy;
  private policyHistory: SecurityPolicy[] = [];
  private mismatchCounter: Map<string, number> = new Map();

  constructor(initialMode: PolicyMode = PolicyMode.BALANCED) {
    this.currentPolicy = { ...DEFAULT_POLICIES[initialMode] };
    this.policyHistory.push({ ...this.currentPolicy });
  }

  /**
   * Get current policy
   */
  getPolicy(): Readonly<SecurityPolicy> {
    return Object.freeze({ ...this.currentPolicy });
  }

  /**
   * Change policy mode
   * Requires creator authorization in production
   */
  setPolicy(newMode: PolicyMode): boolean {
    try {
      if (!DEFAULT_POLICIES[newMode]) {
        console.error(`[PolicyEngine] Invalid policy mode: ${newMode}`);
        return false;
      }

      const newPolicy = { ...DEFAULT_POLICIES[newMode] };
      newPolicy.version = this.currentPolicy.version + 1;
      newPolicy.lastModifiedAt = Date.now();
      newPolicy.modifiedBy = 'creator';

      this.currentPolicy = newPolicy;
      this.policyHistory.push({ ...newPolicy });

      // Keep history limited
      if (this.policyHistory.length > 100) {
        this.policyHistory = this.policyHistory.slice(-100);
      }

      console.log(`[PolicyEngine] Policy changed to ${newMode} (v${newPolicy.version})`);
      return true;
    } catch (err) {
      console.error('[PolicyEngine] Failed to set policy:', err);
      return false;
    }
  }

  /**
   * Determine enforcement action for a signature mismatch
   */
  getEnforcementAction(
    userId: string,
    isCreator: boolean
  ): { action: MismatchAction; shouldBlock: boolean; shouldLog: boolean } {
    const policy = this.currentPolicy;

    // Creator gets preferential treatment in certain modes
    if (isCreator && policy.creatorOverrideEnabled) {
      return {
        action: policy.mismatchAction === MismatchAction.BLOCK ? MismatchAction.REPAIR : policy.mismatchAction,
        shouldBlock: false,
        shouldLog: policy.logAllOverrides
      };
    }

    // Track mismatches for normal users
    const currentCount = (this.mismatchCounter.get(userId) || 0) + 1;
    this.mismatchCounter.set(userId, currentCount);

    // Check if should quarantine
    if (currentCount >= policy.maxMismatchesBeforeQuarantine && !policy.autoLockoutOnMismatch) {
      return {
        action: MismatchAction.QUARANTINE,
        shouldBlock: true,
        shouldLog: true
      };
    }

    return {
      action: policy.mismatchAction,
      shouldBlock: policy.mismatchAction === MismatchAction.BLOCK,
      shouldLog: policy.logAllSignatureChecks
    };
  }

  /**
   * Check if creator can perform a recovery action
   */
  canCreatorRecover(action: string): boolean {
    const policy = this.currentPolicy;

    if (!policy.creatorOverrideEnabled) return false;
    if (!policy.recoveryModeEnabled) return false;

    switch (action) {
      case 'bypassIntegrity':
        return policy.creatorCanBypassIntegrity;
      case 'repairSignatures':
        return policy.creatorCanRepairSignatures;
      case 'emergencyUnlock':
        return policy.allowEmergencyUnlock;
      default:
        return false;
    }
  }

  /**
   * Reset mismatch counter for user
   */
  clearMismatchCounter(userId: string): void {
    this.mismatchCounter.delete(userId);
  }

  /**
   * Get policy history
   */
  getPolicyHistory(): Readonly<SecurityPolicy[]> {
    return Object.freeze([...this.policyHistory]);
  }

  /**
   * Check if in recovery mode
   */
  isInRecoveryMode(): boolean {
    return this.currentPolicy.mode === PolicyMode.RECOVERY;
  }

  /**
   * Export current policy for audit
   */
  exportPolicy(): string {
    return JSON.stringify(this.currentPolicy, null, 2);
  }
}

/**
 * Singleton instance
 */
export const policyEngine = new PolicyEngine();
