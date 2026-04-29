/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SECURITY.SECURITY_INIT.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = security.init.ts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = LeeWay-Standards/src/core/security/security.init.ts
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * SECURITY SYSTEM INITIALIZATION
 * 
 * Example of how to set up the creator-recoverable security framework
 * in the Agent Lee runtime bootstrap.
 * 
 * This is NOT production code - it's a template showing the integration pattern.
 */

import { securityCoordinator, SecurityDecision } from './security.coordinator';
import { creatorAuthority, CreatorAuthLevel, CreatorManifest } from './creator.authority';
import { PolicyMode } from './policy.engine';
import { recoveryEngine } from './recovery.engine';

/**
 * Example creator manifest
 * In production, this should be loaded from a secure configuration service,
 * never hardcoded in source.
 */
function loadCreatorManifest(): CreatorManifest {
  return {
    founderId: 'Lee',
    authorityLevel: CreatorAuthLevel.SOVEREIGN,
    
    currentKeypair: {
      publicKey: 'pk_1234567890abcdef...',  // Load from vault
      privateKeyPath: '/secure/keys/lee-private.key',  // Never load into memory
      keyId: 'lee-key-2026-q1',
      createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,  // 1 year ago
    },
    
    recoveryEnabled: true,
    canBypassIntegrityLock: true,
    canRotateSignatures: true,
    canChangePolicyMode: true,
    canInspectAuditTrail: true,
    canResetTrustChain: true,
    
    // In production: load from secure signer
    selfSignature: 'sig_creator_manifest_verified...',
    
    manifestVersion: 1,
  };
}

/**
 * Initialize security system during runtime bootstrap
 */
export async function initializeSecuritySystem() {
  console.log('[SecurityInit] Starting security system initialization...');

  try {
    // Step 1: Load creator manifest from secure source
    console.log('[SecurityInit] Loading creator manifest...');
    const manifest = loadCreatorManifest();
    
    if (!manifest) {
      throw new Error('Failed to load creator manifest');
    }

    // Step 2: Initialize security coordinator
    console.log('[SecurityInit] Initializing security coordinator...');
    const initialized = securityCoordinator.initialize(manifest, PolicyMode.BALANCED);
    
    if (!initialized) {
      throw new Error('Failed to initialize security coordinator');
    }

    // Step 3: Verify system state
    console.log('[SecurityInit] Verifying system state...');
    const state = securityCoordinator.getSecurityState();
    console.log('[SecurityInit] Current security state:', state);

    // Step 4: Check for recovery needed
    if (state.isLocked) {
      console.warn('[SecurityInit] System is locked - recovery may be needed');
      // In production, alert ops team
    }

    console.log('[SecurityInit] Security system initialized successfully');
    return true;
  } catch (err) {
    console.error('[SecurityInit] Initialization failed:', err);
    console.error('[SecurityInit] CRITICAL: Unable to initialize security - system unsafe');
    process.exit(1);
  }
}

/**
 * Example: Check integrity of a governance action
 */
export function checkGovernanceIntegrity(
  userId: string,
  signatureValid: boolean,
  creatorProofToken?: string
) {
  const result = securityCoordinator.checkIntegrity(
    {
      userId,
      isCreator: userId === 'Lee',
      component: 'governance.engine',
      requestType: 'execute_governance_action',
      timestamp: Date.now()
    },
    signatureValid,
    creatorProofToken
  );

  console.log(`[Governance] ${userId}: ${result.decision} (${result.reason})`);
  return result;
}

/**
 * Example: Recover from a broken component
 */
export async function recoverComponent(
  creatorProofToken: string,
  component: string,
  brokenData?: any
) {
  console.log(`[Recovery] Attempting to recover component: ${component}`);

  try {
    // Authenticate creator
    const context = creatorAuthority.authenticate(
      creatorProofToken,
      CreatorAuthLevel.RECOVERY
    );

    if (!context || !context.isAuthenticated) {
      throw new Error('Creator authentication failed');
    }

    console.log(`[Recovery] Creator authenticated as: ${context.creatorId}`);

    // Attempt recovery
    const recovery = await securityCoordinator.attemptRecovery(
      context,
      component,
      brokenData
    );

    if (recovery.success) {
      console.log(`[Recovery] ✓ Component recovered: ${recovery.message}`);
      return { success: true, message: recovery.message };
    } else {
      console.error(`[Recovery] ✗ Recovery failed: ${recovery.message}`);
      return { success: false, message: recovery.message };
    }
  } catch (err) {
    console.error('[Recovery] Exception during recovery:', err);
    return {
      success: false,
      message: `Recovery exception: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Example: Change security policy
 */
export async function changeSecurityPolicy(
  creatorProofToken: string,
  newMode: PolicyMode
) {
  console.log(`[Policy] Requesting policy change to: ${newMode}`);

  try {
    // Authenticate creator
    const context = creatorAuthority.authenticate(
      creatorProofToken,
      CreatorAuthLevel.PRIVILEGED
    );

    if (!context || !context.isAuthenticated) {
      throw new Error('Creator authentication failed');
    }

    // Attempt policy change
    const result = securityCoordinator.changePolicyMode(context, newMode);

    if (result.success) {
      console.log(`[Policy] ✓ Policy changed: ${result.message}`);
      creatorAuthority.logCreatorAction(context, 'policy_change', { newMode });
      return { success: true, message: result.message };
    } else {
      console.error(`[Policy] ✗ Policy change failed: ${result.message}`);
      return { success: false, message: result.message };
    }
  } catch (err) {
    console.error('[Policy] Exception during policy change:', err);
    return {
      success: false,
      message: `Policy change exception: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Example: Diagnose system health
 */
export async function diagnoseSystem(creatorProofToken: string) {
  console.log('[Diagnosis] Starting system diagnosis...');

  try {
    // Authenticate creator
    const context = creatorAuthority.authenticate(
      creatorProofToken,
      CreatorAuthLevel.USER
    );

    if (!context || !context.isAuthenticated) {
      throw new Error('Creator authentication failed');
    }

    // Get diagnostics
    const report = recoveryEngine.getRecoveryReport(context);

    if (report) {
      console.log('[Diagnosis] System report:');
      console.log(`  State: ${report.systemState}`);
      console.log(`  Issues: ${report.detectedIssues.length} detected`);
      report.detectedIssues.forEach(issue => {
        console.log(`    - ${issue}`);
      });
      console.log(`  Recent recoveries: ${report.recoveryActionsPerformed.length}`);
      if (report.recommendedActions.length > 0) {
        console.log('  Recommendations:');
        report.recommendedActions.forEach(action => {
          console.log(`    - ${action}`);
        });
      }
      return { success: true, report };
    } else {
      return { success: false, message: 'Failed to generate report' };
    }
  } catch (err) {
    console.error('[Diagnosis] Exception during diagnosis:', err);
    return {
      success: false,
      message: `Diagnosis exception: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Example: Emergency system recovery
 */
export async function emergencySystemRecovery(creatorProofToken: string) {
  console.log('[Emergency] INITIATING EMERGENCY SYSTEM RECOVERY');
  console.log('[Emergency] This operation requires sovereign authority');

  try {
    // Authenticate with sovereign authority
    const context = creatorAuthority.authenticate(
      creatorProofToken,
      CreatorAuthLevel.SOVEREIGN
    );

    if (!context || !context.isAuthenticated) {
      throw new Error('Creator authentication failed');
    }

    if (context.authLevel !== CreatorAuthLevel.SOVEREIGN) {
      throw new Error('Insufficient authority for emergency recovery');
    }

    console.log('[Emergency] Creator authenticated with sovereign authority');

    // Perform emergency recovery
    const result = await securityCoordinator.emergencyRecovery(context);

    if (result.success) {
      console.log('[Emergency] ✓ Emergency recovery successful');
      console.log('[Emergency]', result.message);
      creatorAuthority.logCreatorAction(context, 'emergency_recovery', { success: true });
      return { success: true, message: result.message };
    } else {
      console.error('[Emergency] ✗ Emergency recovery failed');
      console.error('[Emergency]', result.message);
      return { success: false, message: result.message };
    }
  } catch (err) {
    console.error('[Emergency] Exception during emergency recovery:', err);
    return {
      success: false,
      message: `Emergency recovery exception: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Example: Export security audit trail
 */
export function exportAuditTrail(limit: number = 500): string {
  const trail = securityCoordinator.getAuditTrail(limit);
  
  const formatted = trail.map(entry => ({
    timestamp: new Date(entry.timestamp).toISOString(),
    user: entry.context.userId,
    component: entry.context.component,
    decision: entry.result.decision,
    reason: entry.result.reason,
    allowed: entry.result.allowed
  }));

  return JSON.stringify(formatted, null, 2);
}

/**
 * Export all security subsystem information for operational awareness
 */
export function exportSecurityStatus() {
  return {
    state: securityCoordinator.getSecurityState(),
    auditTrailEntries: securityCoordinator.getAuditTrail(100).length,
    timestamp: new Date().toISOString()
  };
}

// ============== INTEGRATION WITH RUNTIME ==============

/**
 * Add these calls to Agent Lee runtime bootstrap sequence:
 * 
 * 1. During initialization:
 *    await initializeSecuritySystem();
 * 
 * 2. In governance execution:
 *    const check = checkGovernanceIntegrity(userId, signatureValid, token);
 *    if (!check.allowed) { throw new Error(check.reason); }
 * 
 * 3. In recovery handler:
 *    const recovery = await recoverComponent(creatorToken, component, data);
 * 
 * 4. In policy control:
 *    await changeSecurityPolicy(creatorToken, PolicyMode.RECOVERY);
 * 
 * 5. For monitoring:
 *    const status = exportSecurityStatus();
 *    sendToMonitoring(status);
 */
