# Creator-Recoverable Security Framework

## Overview

This security framework guarantees that **the creator (Lee) can never be permanently locked out** of Agent Lee, while maintaining full integrity enforcement for all other users.

The key principle:
- **Normal users**: Full signature verification, capability checks, audit requirements
- **Creator**: Can recover the system, repair signatures, and change enforcement policies

## Architecture

### Three Core Modules

#### 1. `creator.authority.ts` - Founder Identity & Authentication
Manages founder identity and access control.

**Key types:**
- `CreatorAuthLevel` - Authorization hierarchy (NONE → USER → PRIVILEGED → RECOVERY → SOVEREIGN)
- `CreatorManifest` - Signed proof of founder authority
- `CreatorContext` - Active authenticated session with capabilities

**Usage:**
```typescript
import { creatorAuthority, CreatorAuthLevel } from './creator.authority';

// Initialize with manifest (from secure loader, never hardcoded)
const manifest: CreatorManifest = {
  founderId: 'Lee',
  authorityLevel: CreatorAuthLevel.SOVEREIGN,
  currentKeypair: { /* ... */ },
  recoveryEnabled: true,
  canBypassIntegrityLock: true,
  canRotateSignatures: true,
  canChangePolicyMode: true,
  selfSignature: '...'
};

creatorAuthority.initialize(manifest);

// Authenticate creator with proof token
const context = creatorAuthority.authenticate(proofToken, CreatorAuthLevel.RECOVERY);
if (context?.isAuthenticated) {
  console.log('Creator authenticated with level:', context.authLevel);
  console.log('Available capabilities:', context.overrideCapabilities);
}
```

#### 2. `policy.engine.ts` - Policy Levels & Enforcement
Defines security policy with four modes: STRICT, BALANCED, RELAXED, RECOVERY.

**Policy modes:**
- `STRICT`: Full enforcement, no creator overrides
- `BALANCED`: Enforcement with creator recovery path
- `RELAXED`: Warnings instead of blocks, creator can repair
- `RECOVERY`: Minimal enforcement, creator can bypass anything

**Usage:**
```typescript
import { policyEngine, PolicyMode } from './policy.engine';

// Get current policy
const policy = policyEngine.getPolicy();
console.log('Current mode:', policy.mode);

// Change policy (requires creator authorization in production)
policyEngine.setPolicy(PolicyMode.RECOVERY);

// Check what enforcement action to take
const enforcement = policyEngine.getEnforcementAction(userId, isCreator);
console.log('Action:', enforcement.action); // BLOCK, WARN, REPAIR, etc
```

#### 3. `recovery.engine.ts` - Recovery & Repair
Handles recovery scenarios when signatures are broken or system is locked.

**Key operations:**
- `diagnose()` - System health check and issue detection
- `repairSignatureChain()` - Rebuild broken signature chains
- `resetTrustChain()` - Nuclear option for emergency recovery
- `reissueTrustManifest()` - Reissue valid proof for component
- `emergencyUnlock()` - Force system out of lockout

**Usage:**
```typescript
import { recoveryEngine } from './recovery.engine';

// Creator diagnoses system
const report = recoveryEngine.diagnose(creatorContext);
console.log('System state:', report.systemState);
console.log('Detected issues:', report.detectedIssues);
console.log('Recommendations:', report.recommendedActions);

// Creator repairs broken signature chain
const repair = recoveryEngine.repairSignatureChain(
  creatorContext,
  'governance.engine',
  brokenChain
);
if (repair.success) {
  console.log('Chain repaired, using:', repair.newChain);
}

// Emergency unlock if locked
const unlock = recoveryEngine.emergencyUnlock(creatorContext, 'manual_intervention');
```

### 4. `security.coordinator.ts` - Orchestrator
Brings everything together for unified security decisions.

**Main interface:**
```typescript
import { securityCoordinator, SecurityDecision } from './security.coordinator';

// Initialize
securityCoordinator.initialize(creatorManifest, PolicyMode.BALANCED);

// Check integrity (use this everywhere)
const check = securityCoordinator.checkIntegrity(
  {
    userId: 'user123',
    isCreator: false,
    component: 'governance.engine',
    requestType: 'execute_task'
  },
  signatureValid, // boolean
  creatorProofToken // optional, only if isCreator
);

// Handle result
if (check.allowed) {
  // Proceed with execution
} else if (check.decision === SecurityDecision.QUARANTINE) {
  // Isolate component
} else if (check.decision === SecurityDecision.REPAIR) {
  // Attempt repair
}

// Creator recovery
const recovered = securityCoordinator.attemptRecovery(
  creatorContext,
  'governance.engine',
  brokenData
);

// Emergency system recovery
const emergency = securityCoordinator.emergencyRecovery(creatorContext);
```

## Integration Points

### In Governance Engine
```typescript
import { securityCoordinator } from './security/security.coordinator';

export class GovernanceEngine {
  async executeTask(context: ExecutionContext) {
    // Check integrity before execution
    const securityCheck = securityCoordinator.checkIntegrity(
      {
        userId: context.userId,
        isCreator: context.userId === 'Lee',
        component: 'governance.engine',
        requestType: 'execute_task'
      },
      context.signatureValid,
      context.creatorProofToken
    );

    if (!securityCheck.allowed) {
      if (securityCheck.decision === 'REPAIR' && securityCheck.recoveryAvailable) {
        // Attempt repair
        await securityCoordinator.attemptRecovery(
          context.creatorContext,
          'governance.engine',
          context.brokenData
        );
      } else {
        throw new Error(`Execution denied: ${securityCheck.reason}`);
      }
    }

    // Proceed with execution
    return this.execute(context);
  }
}
```

### In Trust Engine
```typescript
import { securityCoordinator } from './security/security.coordinator';

export class TrustEngine {
  verifySignature(data: any, signature: string) {
    const isValid = this.cryptoVerify(data, signature);

    const check = securityCoordinator.checkIntegrity(
      {
        userId: data.userId,
        isCreator: data.userId === 'Lee',
        component: 'trust.engine',
        requestType: 'verify_signature'
      },
      isValid,
      data.creatorProofToken
    );

    return check;
  }
}
```

## Security Decision Flow

```
Signature Check
    ↓
    ├─ VALID? → ALLOW ✓
    │
    └─ INVALID
         ↓
         ├─ Creator with proof token?
         │  ├─ YES → Check policies
         │  │        ├─ canBypassIntegrity? → REPAIR
         │  │        ├─ creatorOverrideEnabled? → WARN/REPAIR
         │  │        └─ Otherwise → Continue to enforcement
         │  │
         │  └─ NO → Continue to enforcement
         │
         └─ Apply policy enforcement
              ├─ BLOCK mode? → BLOCK ✗
              ├─ QUARANTINE mode? → QUARANTINE
              ├─ REPAIR mode? → REPAIR
              └─ WARN mode? → WARN (continue)
```

## Policy Modes Explained

### STRICT
- **Use case**: Production, high security requirement
- **Signature check**: Required and enforced
- **Mismatch action**: BLOCK (immediate denial)
- **Creator override**: Disabled
- **Result**: Creator cannot bypass, but can still authenticate for recovery

### BALANCED (Recommended Default)
- **Use case**: Normal operation
- **Signature check**: Required but can recover
- **Mismatch action**: QUARANTINE after threshold
- **Creator override**: Enabled with repair capability
- **Result**: Users blocked after 5 failures, but creator can repair

### RELAXED
- **Use case**: Maintenance windows, known issues
- **Signature check**: Optional
- **Mismatch action**: WARN (log but continue)
- **Creator override**: Full bypass capability
- **Result**: Warnings logged, creator can inspect and repair

### RECOVERY
- **Use case**: Emergency recovery only
- **Signature check**: Skipped
- **Mismatch action**: REPAIR (automatic)
- **Creator override**: Full authority
- **Result**: System automatically attempts repair, creator can override everything

## Creator Authentication

### Proof Tokens (Not Raw Secrets!)

**IMPORTANT**: Do NOT use raw strings like `"Eyecyou2912,23,Lee.L"` as production secrets.

Instead:
1. Use real cryptographic keypairs
2. Derive proof tokens from external sources (HSM, vault, device)
3. Use short-lived tokens with expiration
4. Rotate keys regularly

### Example with External Vault
```typescript
// In production, load from secure vault
async function getCreatorProofToken() {
  const vault = new VaultService('https://vault.company.com');
  const token = await vault.getToken('lee/proof-token');
  return token;
}

// Use in security check
const proofToken = await getCreatorProofToken();
const context = creatorAuthority.authenticate(proofToken, CreatorAuthLevel.RECOVERY);
```

### Example with HSM
```typescript
// Use hardware security module for private key operations
async function signWithHSM(data: string) {
  const hsm = new HSMClient();
  const signature = await hsm.sign('lee-key-id', data);
  return signature;
}

const context = creatorAuthority.authenticate(signature, CreatorAuthLevel.SOVEREIGN);
```

## Recovery Scenarios

### Scenario 1: Signature Chain Broken
```typescript
// System detects broken chain during verification
const check = securityCoordinator.checkIntegrity(context, false, proofToken);

if (check.recoveryAvailable) {
  // Creator can repair
  const recovery = await securityCoordinator.attemptRecovery(
    creatorContext,
    'trust.engine',
    brokenChain
  );
  
  if (recovery.success) {
    // Continue with repaired chain
  }
}
```

### Scenario 2: System Locked
```typescript
// System enters lockout due to signature failures
const isLocked = recoveryEngine.isLocked();

if (isLocked && creator.isAuthenticated) {
  // Creator unlocks
  const unlock = recoveryEngine.emergencyUnlock(
    creatorContext,
    'manual_unlock_by_creator'
  );
}
```

### Scenario 3: Complete System Failure
```typescript
// Nuclear option - full system recovery
const emergency = await securityCoordinator.emergencyRecovery(creatorContext);

if (emergency.success) {
  console.log('System recovered and in recovery mode');
  console.log('Manually fix root causes then change policy back to BALANCED');
  
  // Once fixed
  await securityCoordinator.changePolicyMode(creatorContext, PolicyMode.BALANCED);
}
```

## Audit Trail

All security decisions are logged:

```typescript
// Get audit trail
const trail = securityCoordinator.getAuditTrail(100); // Last 100 decisions

trail.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.context.userId} → ${entry.result.decision}`);
  console.log(`  Reason: ${entry.result.reason}`);
  if (entry.result.details) {
    console.log(`  Details:`, entry.result.details);
  }
});
```

## Key Guarantees

✅ **Creator never locked out**: Always has recovery path via proof token
✅ **Normal users protected**: Full enforcement for non-creators
✅ **Policies separate from code**: Can change enforcement without redeployment
✅ **All operations auditable**: Every decision is logged
✅ **Tamper-resistant**: Broken chains can be repaired, not ignored
✅ **No permanent lockout**: Recovery mode ensures accessibility

## DO NOT

❌ Hardcode secrets in code
❌ Use raw keys as proof tokens
❌ Skip signature verification for non-creators
❌ Make policy changes without logging
❌ Ignore recovery opportunities
❌ Store recovery keys unencrypted
❌ Trust tokens without expiration

## DO

✅ Load secrets from external vault
✅ Use short-lived derived tokens
✅ Always verify non-creator signatures
✅ Log all policy changes with creator ID
✅ Use recovery engine when signatures fail
✅ Encrypt all stored keys
✅ Add expiration to all auth tokens
✅ Rotate keys regularly
✅ Test recovery paths before production

## Migration Path

1. **Phase 1**: Implement in test environment with BALANCED mode
2. **Phase 2**: Add to staging with all recovery paths tested
3. **Phase 3**: Deploy to production with monitoring
4. **Phase 4**: Switch non-critical systems to STRICT as confidence grows
5. **Phase 5**: Regular key rotation and audit reviews

---

**Created**: April 15, 2026  
**Purpose**: Guarantee creator recovery while maintaining system security  
**Principle**: Tamper-resistant for others, recoverable for founder
