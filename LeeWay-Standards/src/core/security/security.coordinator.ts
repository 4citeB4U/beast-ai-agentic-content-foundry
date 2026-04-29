/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SECURITY.SECURITY_COORDINATOR.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = security.coordinator.ts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = LeeWay-Standards/src/core/security/security.coordinator.ts
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * INTEGRATED SECURITY FRAMEWORK
 * 
 * Brings together creator authority, policy engine, and recovery engine.
 * This is the primary interface for security decisions in Agent Lee runtime.
 * 
 * PRINCIPLE: Normal users get full integrity enforcement.
 *            Creator gets recovery authority while maintaining audit transparency.
 */

import { creatorAuthority, CreatorContext, CreatorAuthLevel, CreatorManifest } from './creator.authority';
import { policyEngine, PolicyEngine, PolicyMode, MismatchAction } from './policy.engine';
import { recoveryEngine, RecoveryEngine } from './recovery.engine';

export enum SecurityDecision {
  ALLOW = 'allow',
  WARN = 'warn',
  QUARANTINE = 'quarantine',
  BLOCK = 'block',
  REPAIR = 'repair',
  RECOVERY = 'recovery'
}

export interface SecurityContext {
  userId: string;
  isCreator: boolean;
  creatorContext?: CreatorContext | null;
  requestType: string;
  component: string;
  timestamp: number;
}

export interface SecurityCheckResult {
  decision: SecurityDecision;
  allowed: boolean;
  reason: string;
  shouldLog: boolean;
  recoveryAvailable: boolean;
  details?: Record<string, any>;
}

/**
 * Integrated security coordinator
 * Orchestrates all three security subsystems
 */
export class SecurityCoordinator {
  private creatorManifest: CreatorManifest | null = null;
  private decisionLog: Array<{
    timestamp: number;
    context: SecurityContext;
    result: SecurityCheckResult;
  }> = [];

  /**
   * Initialize security system with creator manifest
   */
  initialize(manifest: CreatorManifest, initialPolicy: PolicyMode = PolicyMode.BALANCED): boolean {
    try {
      if (!creatorAuthority.initialize(manifest)) {
        console.error('[SecurityCoordinator] Failed to initialize creator authority');
        return false;
      }

      this.creatorManifest = manifest;
      policyEngine.setPolicy(initialPolicy);

      console.log(`[SecurityCoordinator] Initialized with policy: ${initialPolicy}`);
      return true;
    } catch (err) {
      console.error('[SecurityCoordinator] Initialization failed:', err);
      return false;
    }
  }

  /**
   * Main security check - use this for all integrity decisions
   */
  checkIntegrity(
    context: SecurityContext,
    signatureValid: boolean,
    creatorProofToken?: string
  ): SecurityCheckResult {
    const result: SecurityCheckResult = {
      decision: SecurityDecision.ALLOW,
      allowed: true,
      reason: '',
      shouldLog: false,
      recoveryAvailable: false
    };

    try {
      // If signature is valid, always allow
      if (signatureValid) {
        result.decision = SecurityDecision.ALLOW;
        result.allowed = true;
        result.reason = 'Signature valid';
        this.logDecision(context, result);
        return result;
      }

      // Signature is invalid - check policy and context
      const policy = policyEngine.getPolicy();

      // If creator and has proof token, authenticate
      if (context.isCreator && creatorProofToken) {
        const creatorCtx = creatorAuthority.authenticate(creatorProofToken, CreatorAuthLevel.RECOVERY);
        if (creatorCtx && creatorCtx.isAuthenticated) {
          context.creatorContext = creatorCtx;

          // Creator authenticated - check what they can do
          if (policy.creatorCanBypassIntegrity) {
            result.decision = SecurityDecision.REPAIR;
            result.allowed = true;
            result.reason = 'Creator authenticated - repair mode enabled';
            result.shouldLog = policy.logAllOverrides;
            result.recoveryAvailable = true;
            this.logDecision(context, result);
            return result;
          }

          if (policy.creatorOverrideEnabled && !policy.integrityRequired) {
            result.decision = SecurityDecision.WARN;
            result.allowed = true;
            result.reason = 'Creator authenticated - proceeding with warnings';
            result.shouldLog = policy.logAllOverrides;
            result.recoveryAvailable = true;
            this.logDecision(context, result);
            return result;
          }
        }
      }

      // Not creator or authentication failed - apply standard enforcement
      const enforcement = policyEngine.getEnforcementAction(context.userId, context.isCreator);

      switch (enforcement.action) {
        case MismatchAction.BLOCK:
          result.decision = SecurityDecision.BLOCK;
          result.allowed = false;
          result.reason = 'Signature mismatch - blocked by policy';
          result.shouldLog = enforcement.shouldLog;
          break;

        case MismatchAction.QUARANTINE:
          result.decision = SecurityDecision.QUARANTINE;
          result.allowed = false;
          result.reason = 'Signature mismatch - component quarantined';
          result.shouldLog = enforcement.shouldLog;
          result.recoveryAvailable = context.isCreator;
          break;

        case MismatchAction.REPAIR:
          result.decision = SecurityDecision.REPAIR;
          result.allowed = true;
          result.reason = 'Signature mismatch - automatic repair attempted';
          result.shouldLog = enforcement.shouldLog;
          result.recoveryAvailable = true;
          break;

        case MismatchAction.WARN:
        default:
          result.decision = SecurityDecision.WARN;
          result.allowed = true;
          result.reason = 'Signature mismatch - warning logged, proceeding';
          result.shouldLog = enforcement.shouldLog;
          result.recoveryAvailable = context.isCreator;
          break;
      }

      this.logDecision(context, result);
      return result;
    } catch (err) {
      console.error('[SecurityCoordinator] Integrity check failed:', err);
      result.decision = SecurityDecision.BLOCK;
      result.allowed = false;
      result.reason = `Security check error: ${err instanceof Error ? err.message : String(err)}`;
      result.shouldLog = true;
      this.logDecision(context, result);
      return result;
    }
  }

  /**
   * Attempt recovery of a failed component
   */
  attemptRecovery(
    creatorContext: CreatorContext,
    component: string,
    brokenData?: any
  ): { success: boolean; message: string } {
    if (!creatorContext.isAuthenticated) {
      return { success: false, message: 'Not authenticated as creator' };
    }

    try {
      // Try repair if data provided
      if (brokenData) {
        const repair = recoveryEngine.repairSignatureChain(creatorContext, component, brokenData);
        if (repair.success) {
          return { success: true, message: `Component ${component} recovered` };
        }
      }

      // Fall back to trust manifest reissue
      const reissue = recoveryEngine.reissueTrustManifest(creatorContext, component);
      if (reissue.success) {
        return { success: true, message: `Trust manifest reissued for ${component}` };
      }

      return { success: false, message: 'Recovery failed for all strategies' };
    } catch (err) {
      return { success: false, message: `Recovery error: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  /**
   * Change security policy
   * Requires creator authorization
   */
  changePolicyMode(
    creatorContext: CreatorContext,
    newMode: PolicyMode
  ): { success: boolean; message: string } {
    if (!creatorContext.isAuthenticated || !creatorContext.overrideCapabilities.includes('canChangePolicyMode')) {
      return { success: false, message: 'Not authorized to change policy' };
    }

    const success = policyEngine.setPolicy(newMode);
    if (success) {
      creatorAuthority.logCreatorAction(
        creatorContext,
        'changePolicyMode',
        { from: policyEngine.getPolicy().mode, to: newMode }
      );
      return { success: true, message: `Policy changed to ${newMode}` };
    }

    return { success: false, message: 'Failed to change policy' };
  }

  /**
   * Get current security state
   */
  getSecurityState(creatorContext?: CreatorContext): {
    policy: PolicyMode;
    systemState: string;
    isLocked: boolean;
    creatorAuthenticated: boolean;
    decisionCount: number;
  } {
    return {
      policy: policyEngine.getPolicy().mode,
      systemState: recoveryEngine.isLocked() ? 'locked' : 'operational',
      isLocked: recoveryEngine.isLocked(),
      creatorAuthenticated: creatorContext?.isAuthenticated || false,
      decisionCount: this.decisionLog.length
    };
  }

  /**
   * Export audit trail
   */
  getAuditTrail(limit: number = 100): Array<{
    timestamp: number;
    context: SecurityContext;
    result: SecurityCheckResult;
  }> {
    return this.decisionLog.slice(-limit);
  }

  /**
   * Emergency system recovery
   */
  emergencyRecovery(creatorContext: CreatorContext): { success: boolean; message: string } {
    if (!creatorContext.isAuthenticated || creatorContext.authLevel !== CreatorAuthLevel.SOVEREIGN) {
      return { success: false, message: 'Only sovereign creator can perform emergency recovery' };
    }

    try {
      // Step 1: Emergency unlock if needed
      if (recoveryEngine.isLocked()) {
        recoveryEngine.emergencyUnlock(creatorContext, 'emergency_recovery_initiated');
      }

      // Step 2: Reset trust chain
      const resetResult = recoveryEngine.resetTrustChain(creatorContext, PolicyMode.RECOVERY);
      if (!resetResult.success) {
        return resetResult;
      }

      // Step 3: Switch to recovery mode
      const policyResult = this.changePolicyMode(creatorContext, PolicyMode.RECOVERY);
      if (!policyResult.success) {
        return policyResult;
      }

      return {
        success: true,
        message: 'Emergency recovery complete - system in recovery mode'
      };
    } catch (err) {
      return {
        success: false,
        message: `Emergency recovery failed: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }

  // ============== INTERNAL METHODS ==============

  private logDecision(context: SecurityContext, result: SecurityCheckResult): void {
    this.decisionLog.push({
      timestamp: Date.now(),
      context,
      result
    });

    // Keep log limited
    if (this.decisionLog.length > 10000) {
      this.decisionLog = this.decisionLog.slice(-10000);
    }

    if (result.shouldLog) {
      console.log(`[SecurityCoordinator] ${context.userId}/${context.component}: ${result.decision} - ${result.reason}`);
    }
  }
}

/**
 * Singleton coordinator instance
 */
export const securityCoordinator = new SecurityCoordinator();

/**
 * Export all types for external use
 */
export { CreatorContext, CreatorAuthLevel, PolicyMode, SecurityPolicy } from './policy.engine';
export { RecoveryReport, RecoveryAttempt } from './recovery.engine';
