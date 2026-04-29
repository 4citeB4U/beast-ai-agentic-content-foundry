/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.CORE.SECURITY.CREATOR_AUTHORITY.MAIN
DESCRIPTION: Auto-enforced by LeeWay Standards Enforcement Engine
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = creator.authority.ts — governed module
WHY = Enforce LeeWay architectural standards in this file
WHO = Leeway Industries / LeeWay Standards Enforcement Engine
WHERE = LeeWay-Standards/src/core/security/creator.authority.ts
WHEN = 2026-04-18
HOW = Auto-enforced header; update manually with full 5WH detail

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: PROPRIETARY
*/
/**
 * CREATOR AUTHORITY MODULE
 * 
 * Separates founder identity from integrity enforcement.
 * Guarantees that the creator can never be permanently locked out,
 * while maintaining full security for all other users.
 * 
 * DO NOT use raw secrets in code. This is a cryptographic framework only.
 */

import crypto from 'crypto';

export enum CreatorAuthLevel {
  NONE = 'none',
  USER = 'user',
  PRIVILEGED = 'privileged',
  RECOVERY = 'recovery',
  SOVEREIGN = 'sovereign'
}

export interface CreatorKeypair {
  publicKey: string;
  privateKeyPath: string;  // Never store raw private key in code
  keyId: string;
  createdAt: number;
  rotatedAt?: number;
}

export interface RecoveryBundle {
  creatorId: string;
  recoveryPhrase: string;  // BIP39-style mnemonic, stored offline
  backupPublicKey: string;
  emergencyContactHash: string;  // Hash only, never plaintext
  bundleSignature: string;
  createdAt: number;
}

export interface CreatorManifest {
  founderId: string;
  authorityLevel: CreatorAuthLevel;
  currentKeypair: CreatorKeypair;
  recoveryEnabled: boolean;
  canBypassIntegrityLock: boolean;
  canRotateSignatures: boolean;
  canChangePolicyMode: boolean;
  canInspectAuditTrail: boolean;
  canResetTrustChain: boolean;
  // Signature proof that this manifest is authentic
  selfSignature: string;
  manifestVersion: number;
  lastAuthenticatedAt?: number;
}

/**
 * Creator authentication context
 * Includes proof of founder identity without exposing secrets
 */
export interface CreatorContext {
  creatorId: string;
  authLevel: CreatorAuthLevel;
  isAuthenticated: boolean;
  authProofToken: string;
  expiresAt: number;
  recoveryMode: boolean;
  overrideCapabilities: string[];
}

/**
 * Manages founder identity and authentication
 * All cryptographic operations are framework only - real keys must be external
 */
export class CreatorAuthority {
  private manifest: CreatorManifest | null = null;
  private activeContexts: Map<string, CreatorContext> = new Map();
  private authenticationLog: Array<{
    timestamp: number;
    creatorId: string;
    level: CreatorAuthLevel;
    action: string;
    result: 'success' | 'failed' | 'denied';
  }> = [];

  /**
   * Initialize with a pre-verified creator manifest
   * In production, this manifest should come from a secure loader, not code
   */
  initialize(manifest: CreatorManifest): boolean {
    try {
      // Verify manifest self-signature (framework check only)
      if (!this.verifyManifestSignature(manifest)) {
        console.error('[CreatorAuthority] Manifest signature verification failed');
        return false;
      }

      this.manifest = manifest;
      this.logAuthentication(manifest.founderId, manifest.authorityLevel, 'initialize', 'success');
      return true;
    } catch (err) {
      console.error('[CreatorAuthority] Initialization failed:', err);
      this.logAuthentication('unknown', CreatorAuthLevel.NONE, 'initialize', 'failed');
      return false;
    }
  }

  /**
   * Authenticate creator using proof token
   * Token should be derived from external secure source (HSM, vault, etc)
   */
  authenticate(proofToken: string, requestedLevel: CreatorAuthLevel = CreatorAuthLevel.USER): CreatorContext | null {
    if (!this.manifest) {
      this.logAuthentication('unknown', CreatorAuthLevel.NONE, 'authenticate', 'denied');
      return null;
    }

    try {
      // Verify proof token format (framework check)
      if (!this.verifyProofToken(proofToken, this.manifest.founderId)) {
        this.logAuthentication(this.manifest.founderId, requestedLevel, 'authenticate', 'failed');
        return null;
      }

      // Determine granted level (cannot exceed manifest level)
      const grantedLevel = this.determineAuthLevel(requestedLevel, this.manifest.authorityLevel);

      const context: CreatorContext = {
        creatorId: this.manifest.founderId,
        authLevel: grantedLevel,
        isAuthenticated: true,
        authProofToken: proofToken,
        expiresAt: Date.now() + 3600000, // 1 hour expiry
        recoveryMode: grantedLevel === CreatorAuthLevel.RECOVERY,
        overrideCapabilities: this.getCapabilities(grantedLevel)
      };

      const contextId = crypto.randomUUID();
      this.activeContexts.set(contextId, context);
      this.logAuthentication(this.manifest.founderId, grantedLevel, 'authenticate', 'success');

      return context;
    } catch (err) {
      console.error('[CreatorAuthority] Authentication failed:', err);
      this.logAuthentication(this.manifest?.founderId || 'unknown', requestedLevel, 'authenticate', 'failed');
      return null;
    }
  }

  /**
   * Check if context is valid and has specific capability
   */
  isAuthorized(context: CreatorContext | null, capability: string): boolean {
    if (!context || !context.isAuthenticated) return false;
    if (context.expiresAt < Date.now()) return false;
    if (!context.overrideCapabilities.includes(capability)) return false;
    return true;
  }

  /**
   * Get current manifest (for audit/display only)
   */
  getManifest(): CreatorManifest | null {
    return this.manifest ? { ...this.manifest } : null;
  }

  /**
   * Record founder action for audit trail
   */
  logCreatorAction(context: CreatorContext, action: string, details: any): void {
    if (this.isAuthorized(context, 'canInspectAuditTrail')) {
      console.log(`[CreatorAuthority] ${context.creatorId} performed: ${action}`, details);
    }
  }

  // ============== INTERNAL METHODS ==============

  private verifyManifestSignature(manifest: CreatorManifest): boolean {
    // In production: verify against creator's public key
    // This is framework structure only - real verification uses external crypto
    return manifest.selfSignature !== '' && manifest.founderId === 'Lee';
  }

  private verifyProofToken(token: string, expectedCreatorId: string): boolean {
    // In production: verify token against HSM or vault
    // Framework check: token should be non-empty and creatorId should match
    return token.length > 0 && expectedCreatorId !== '';
  }

  private determineAuthLevel(requested: CreatorAuthLevel, manifested: CreatorAuthLevel): CreatorAuthLevel {
    // Hierarchy: NONE < USER < PRIVILEGED < RECOVERY < SOVEREIGN
    const hierarchy = [
      CreatorAuthLevel.NONE,
      CreatorAuthLevel.USER,
      CreatorAuthLevel.PRIVILEGED,
      CreatorAuthLevel.RECOVERY,
      CreatorAuthLevel.SOVEREIGN
    ];

    const requestedIdx = hierarchy.indexOf(requested);
    const manifestedIdx = hierarchy.indexOf(manifested);

    // Cannot grant higher than manifested level
    return hierarchy[Math.min(requestedIdx, manifestedIdx)];
  }

  private getCapabilities(level: CreatorAuthLevel): string[] {
    switch (level) {
      case CreatorAuthLevel.NONE:
        return [];
      case CreatorAuthLevel.USER:
        return ['canInspectAuditTrail'];
      case CreatorAuthLevel.PRIVILEGED:
        return [
          'canInspectAuditTrail',
          'canChangePolicyMode',
          'canRotateSignatures'
        ];
      case CreatorAuthLevel.RECOVERY:
        return [
          'canInspectAuditTrail',
          'canChangePolicyMode',
          'canRotateSignatures',
          'canBypassIntegrityLock',
          'canResetTrustChain'
        ];
      case CreatorAuthLevel.SOVEREIGN:
        return [
          'canInspectAuditTrail',
          'canChangePolicyMode',
          'canRotateSignatures',
          'canBypassIntegrityLock',
          'canResetTrustChain',
          'canIssuePolicies',
          'canModifyRecoveryBundle'
        ];
      default:
        return [];
    }
  }

  private logAuthentication(
    creatorId: string,
    level: CreatorAuthLevel,
    action: string,
    result: 'success' | 'failed' | 'denied'
  ): void {
    this.authenticationLog.push({
      timestamp: Date.now(),
      creatorId,
      level,
      action,
      result
    });

    // Keep last 1000 entries
    if (this.authenticationLog.length > 1000) {
      this.authenticationLog = this.authenticationLog.slice(-1000);
    }
  }

  /**
   * Export auth log for audit purposes
   * Only accessible with proper authorization
   */
  getAuthLog(context: CreatorContext): any[] | null {
    if (this.isAuthorized(context, 'canInspectAuditTrail')) {
      return [...this.authenticationLog];
    }
    return null;
  }
}

/**
 * Singleton instance of creator authority
 */
export const creatorAuthority = new CreatorAuthority();
