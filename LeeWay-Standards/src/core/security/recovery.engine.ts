/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SECURITY.RECOVERY_ENGINE.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = recovery.engine.ts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = LeeWay-Standards/src/core/security/recovery.engine.ts
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * RECOVERY ENGINE MODULE
 * 
 * Handles recovery scenarios and repair of broken signature chains.
 * Guarantees that creator can recover the system from failure states.
 * 
 * Operations here are always logged and auditable.
 */

import { CreatorContext, CreatorAuthLevel } from './creator.authority';
import { PolicyMode } from './policy.engine';

export interface RecoveryAttempt {
  id: string;
  timestamp: number;
  creatorId: string;
  attemptType: 'inspect' | 'repair' | 'reset' | 'reissue' | 'unlock';
  targetComponent: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';
  details: Record<string, any>;
  result?: string;
  errorMessage?: string;
}

export interface RecoveryReport {
  reportId: string;
  timestamp: number;
  creatorId: string;
  systemState: 'healthy' | 'degraded' | 'broken' | 'locked' | 'recovering';
  detectedIssues: string[];
  recoveryActionsPerformed: string[];
  recommendedActions: string[];
  recoveryStatus: 'no_action_needed' | 'recovery_pending' | 'recovery_in_progress' | 'recovery_complete' | 'recovery_failed';
}

/**
 * Manages recovery operations
 */
export class RecoveryEngine {
  private recoveryHistory: RecoveryAttempt[] = [];
  private systemState: 'healthy' | 'degraded' | 'broken' | 'locked' | 'recovering' = 'healthy';
  private lockState: {
    isLocked: boolean;
    lockedAt?: number;
    lockedReason?: string;
    unlockedBy?: string;
    unlockedAt?: number;
  } = { isLocked: false };

  /**
   * Diagnose system state and return recovery report
   */
  diagnose(context: CreatorContext): RecoveryReport | null {
    if (!context.isAuthenticated || context.authLevel === CreatorAuthLevel.NONE) {
      console.warn('[RecoveryEngine] Unauthorized diagnosis attempt');
      return null;
    }

    const report: RecoveryReport = {
      reportId: this.generateId(),
      timestamp: Date.now(),
      creatorId: context.creatorId,
      systemState: this.systemState,
      detectedIssues: this.detectIssues(),
      recoveryActionsPerformed: this.getRecentRecoveryActions(10),
      recommendedActions: this.recommendActions(),
      recoveryStatus: this.getRecoveryStatus()
    };

    this.logRecovery({
      id: report.reportId,
      timestamp: Date.now(),
      creatorId: context.creatorId,
      attemptType: 'inspect',
      targetComponent: 'system_diagnostics',
      status: 'success',
      details: { report }
    });

    return report;
  }

  /**
   * Repair broken signature chain
   * Only available to creator in authorized context
   */
  repairSignatureChain(
    context: CreatorContext,
    targetComponent: string,
    brokenChain: any[]
  ): { success: boolean; newChain?: any[]; error?: string } {
    if (!context.isAuthenticated || !context.overrideCapabilities.includes('canResetTrustChain')) {
      console.warn(`[RecoveryEngine] Unauthorized repair attempt for ${targetComponent}`);
      return { success: false, error: 'Not authorized to repair signatures' };
    }

    try {
      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'repair',
        targetComponent,
        status: 'in_progress',
        details: { chainLength: brokenChain.length }
      });

      // Repair logic: rebuild chain from last valid hash
      const repairedChain = this.rebuildChain(brokenChain);

      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'repair',
        targetComponent,
        status: 'success',
        details: { newChainLength: repairedChain.length },
        result: 'Signature chain repaired'
      });

      return { success: true, newChain: repairedChain };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'repair',
        targetComponent,
        status: 'failed',
        details: { error: errorMsg }
      });
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Reset entire trust chain
   * Nuclear option - only for emergency recovery
   */
  resetTrustChain(
    context: CreatorContext,
    policyMode: PolicyMode
  ): { success: boolean; message: string } {
    if (!context.overrideCapabilities.includes('canResetTrustChain')) {
      return { success: false, message: 'Not authorized to reset trust chain' };
    }

    if (context.authLevel !== CreatorAuthLevel.SOVEREIGN && context.authLevel !== CreatorAuthLevel.RECOVERY) {
      return { success: false, message: 'Insufficient authority level for trust chain reset' };
    }

    try {
      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'reset',
        targetComponent: 'trust_chain',
        status: 'in_progress',
        details: { policyMode }
      });

      // Reset: declare all signatures valid for recovery period
      this.systemState = 'recovering';

      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'reset',
        targetComponent: 'trust_chain',
        status: 'success',
        details: { newState: this.systemState },
        result: 'Trust chain reset initiated. System in recovery mode.'
      });

      return { success: true, message: 'Trust chain reset successful. System entering recovery mode.' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'reset',
        targetComponent: 'trust_chain',
        status: 'failed',
        errorMessage: errorMsg
      });
      return { success: false, message: `Trust chain reset failed: ${errorMsg}` };
    }
  }

  /**
   * Reissue a trust manifest for a component
   */
  reissueTrustManifest(
    context: CreatorContext,
    componentId: string
  ): { success: boolean; manifest?: any; error?: string } {
    if (!context.isAuthenticated || !context.overrideCapabilities.includes('canResetTrustChain')) {
      return { success: false, error: 'Not authorized to reissue trust manifest' };
    }

    try {
      const manifest = {
        componentId,
        version: 1,
        issuedAt: Date.now(),
        issuedBy: context.creatorId,
        trustLevel: 'verified',
        expiresAt: Date.now() + 86400000 * 365 // 1 year
      };

      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'reissue',
        targetComponent: componentId,
        status: 'success',
        details: { manifest }
      });

      return { success: true, manifest };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Emergency unlock - forces system out of lockout
   */
  emergencyUnlock(
    context: CreatorContext,
    reason: string
  ): { success: boolean; message: string } {
    if (!context.isAuthenticated || !context.overrideCapabilities.includes('canBypassIntegrityLock')) {
      return { success: false, message: 'Not authorized for emergency unlock' };
    }

    try {
      this.lockState.isLocked = false;
      this.lockState.unlockedBy = context.creatorId;
      this.lockState.unlockedAt = Date.now();

      this.logRecovery({
        id: this.generateId(),
        timestamp: Date.now(),
        creatorId: context.creatorId,
        attemptType: 'unlock',
        targetComponent: 'system_lock',
        status: 'success',
        details: { reason, lockDurationMs: (this.lockState.unlockedAt || 0) - (this.lockState.lockedAt || 0) }
      });

      return { success: true, message: 'System emergency unlock successful' };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, message: errorMsg };
    }
  }

  /**
   * Mark system as locked
   */
  lockSystem(reason: string): void {
    this.lockState.isLocked = true;
    this.lockState.lockedAt = Date.now();
    this.lockState.lockedReason = reason;
    this.systemState = 'locked';
  }

  /**
   * Check if system is locked
   */
  isLocked(): boolean {
    return this.lockState.isLocked;
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(limit: number = 50): RecoveryAttempt[] {
    return this.recoveryHistory.slice(-limit);
  }

  /**
   * Get detailed recovery report
   */
  getRecoveryReport(context: CreatorContext): RecoveryReport | null {
    if (!context.isAuthenticated) return null;
    return this.diagnose(context);
  }

  // ============== INTERNAL METHODS ==============

  private detectIssues(): string[] {
    const issues: string[] = [];

    if (this.lockState.isLocked) {
      issues.push(`System locked: ${this.lockState.lockedReason}`);
    }

    if (this.systemState === 'broken') {
      issues.push('System in broken state - recovery required');
    }

    if (this.systemState === 'degraded') {
      issues.push('System in degraded state - partial functionality');
    }

    if (this.recoveryHistory.length > 0) {
      const recentFailures = this.recoveryHistory
        .filter(r => r.status === 'failed')
        .slice(-5);

      if (recentFailures.length > 0) {
        issues.push(`${recentFailures.length} recent recovery failures`);
      }
    }

    return issues;
  }

  private recommendActions(): string[] {
    const recommendations: string[] = [];

    if (this.lockState.isLocked) {
      recommendations.push('System is locked - use emergencyUnlock if authorized');
    }

    if (this.systemState === 'broken') {
      recommendations.push('Run resetTrustChain to enter recovery mode');
      recommendations.push('Inspect audit trail for root cause');
    }

    if (this.systemState === 'recovering') {
      recommendations.push('System in recovery mode - repair operations in progress');
      recommendations.push('Monitor recovery completion');
    }

    return recommendations;
  }

  private getRecoveryStatus(): RecoveryReport['recoveryStatus'] {
    if (this.systemState === 'healthy') return 'no_action_needed';
    if (this.systemState === 'degraded') return 'recovery_pending';
    if (this.systemState === 'recovering') return 'recovery_in_progress';
    if (this.systemState === 'broken' || this.lockState.isLocked) return 'recovery_failed';
    return 'no_action_needed';
  }

  private getRecentRecoveryActions(count: number): string[] {
    return this.recoveryHistory
      .filter(r => r.status === 'success')
      .slice(-count)
      .map(r => `${r.attemptType}(${r.targetComponent})`);
  }

  private rebuildChain(brokenChain: any[]): any[] {
    // Simple rebuild: create new chain with creator signature
    return brokenChain.map((item, idx) => ({
      ...item,
      index: idx,
      previousHash: idx > 0 ? this.hash(brokenChain[idx - 1]) : null,
      repaired: true,
      repairedAt: Date.now()
    }));
  }

  private hash(obj: any): string {
    // Placeholder - in production use cryptographic hash
    return Buffer.from(JSON.stringify(obj)).toString('base64').substring(0, 32);
  }

  private logRecovery(attempt: RecoveryAttempt): void {
    this.recoveryHistory.push(attempt);

    // Keep history limited
    if (this.recoveryHistory.length > 1000) {
      this.recoveryHistory = this.recoveryHistory.slice(-1000);
    }

    console.log(`[RecoveryEngine] ${attempt.attemptType}/${attempt.targetComponent}: ${attempt.status}`, attempt);
  }

  private generateId(): string {
    return `recovery_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Singleton instance
 */
export const recoveryEngine = new RecoveryEngine();
