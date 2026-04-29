# Creator-Recoverable Security Framework - Quick Reference

## Quick Start

```typescript
import { securityCoordinator } from './security/security.coordinator';
import { creatorAuthority } from './security/creator.authority';

// 1. Check integrity (use everywhere)
const check = securityCoordinator.checkIntegrity({
  userId,
  isCreator: userId === 'Lee',
  component: 'my.engine',
  requestType: 'action'
}, signatureValid, creatorProofToken);

// 2. Handle result
if (check.allowed) {
  // Proceed
} else if (check.recoveryAvailable) {
  // Try recovery
  securityCoordinator.attemptRecovery(creatorContext, component, data);
}

// 3. If system locked
securityCoordinator.emergencyRecovery(creatorContext);
```

---

## Security Decisions

| Decision | Meaning | For Normal User | For Creator |
|----------|---------|-----------------|-------------|
| **ALLOW** | Signature valid, proceed | ✓ Execute | ✓ Execute |
| **WARN** | Continue with warnings | ✓ Execute (logged) | ✓ Execute (override) |
| **QUARANTINE** | Component isolated | ✗ Blocked | ✓ Can recover |
| **BLOCK** | Denied | ✗ Blocked | - (rare) |
| **REPAIR** | Auto-repair attempted | - | ✓ Repair + execute |
| **RECOVERY** | System recovery mode | ✗ All blocked | ✓ Full control |

---

## Policy Modes

```
STRICT     → Maximum enforcement, creator overrides disabled
BALANCED   → Recommended: enforcement with creator recovery
RELAXED    → Warnings only, creator has full bypass
RECOVERY   → Emergency mode, minimal enforcement
```

---

## Creator Authority Levels

```
NONE        → No access
USER        → Can inspect audit trail
PRIVILEGED  → Can change policies + rotate signatures
RECOVERY    → Can repair + reset + unlock
SOVEREIGN   → Full control (can modify recovery bundle)
```

---

## Capabilities by Level

| Level | Audit | Policy | Sign | Bypass | Repair | Reset |
|-------|-------|--------|------|--------|--------|-------|
| USER | ✓ | - | - | - | - | - |
| PRIVILEGED | ✓ | ✓ | ✓ | - | - | - |
| RECOVERY | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SOVEREIGN | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Common Operations

### Check Integrity
```typescript
const result = securityCoordinator.checkIntegrity({
  userId: 'user123',
  isCreator: false,
  component: 'governance',
  requestType: 'execute'
}, signatureValid);

console.log(result.decision); // ALLOW | WARN | BLOCK | etc
```

### Authenticate Creator
```typescript
const context = creatorAuthority.authenticate(
  proofToken,
  CreatorAuthLevel.RECOVERY
);

if (context?.isAuthenticated) {
  console.log('Capabilities:', context.overrideCapabilities);
}
```

### Change Policy
```typescript
securityCoordinator.changePolicyMode(
  creatorContext,
  PolicyMode.RECOVERY
);
```

### Diagnose System
```typescript
const report = recoveryEngine.diagnose(creatorContext);
console.log('State:', report.systemState);
console.log('Issues:', report.detectedIssues);
console.log('Actions:', report.recommendedActions);
```

### Repair Component
```typescript
const result = recoveryEngine.repairSignatureChain(
  creatorContext,
  'component.name',
  brokenChain
);
```

### Emergency Recovery
```typescript
const result = securityCoordinator.emergencyRecovery(
  creatorContext
);
```

### Get Audit Trail
```typescript
const trail = securityCoordinator.getAuditTrail(100);
trail.forEach(entry => {
  console.log(`${entry.timestamp}: ${entry.context.userId} → ${entry.result.decision}`);
});
```

---

## File Structure

```
core/security/
├── creator.authority.ts        ← Founder identity & auth
├── policy.engine.ts            ← Security policies & enforcement
├── recovery.engine.ts          ← Recovery & repair operations
├── security.coordinator.ts     ← Main orchestrator (use this!)
├── security.init.ts            ← Bootstrap integration example
├── SECURITY_FRAMEWORK.md       ← Full documentation
└── TRANSFORMATION.md           ← Migration guide
```

---

## Integration Points

### In GovernanceEngine
```typescript
const check = securityCoordinator.checkIntegrity(
  { userId, isCreator, component: 'governance', requestType: 'execute' },
  signatureValid,
  creatorProofToken
);
if (!check.allowed) throw new Error(check.reason);
```

### In TrustEngine
```typescript
const result = securityCoordinator.checkIntegrity(
  { userId, isCreator, component: 'trust', requestType: 'verify' },
  isSignatureValid
);
```

### In Bootstrap
```typescript
import { initializeSecuritySystem } from './core/security/security.init';
await initializeSecuritySystem();
```

---

## Error Scenarios

### Signature Mismatch
```
Normal user: QUARANTINE (after threshold)
Creator (no token): Apply policy enforcement
Creator (with token): REPAIR or WARN depending on policy
```

### System Locked
```
creator?.emergencyUnlock(creatorContext, reason)
→ Forces unlock + recovery mode
```

### Policy Change Denied
```
if (context.authLevel < PRIVILEGED) {
  throw 'Insufficient authority'
}
```

### Recovery Failed
```
Check: recoveryEngine.diagnose() → recommendations
Try: Different repair strategy
Last resort: emergencyRecovery()
```

---

## DO's

✅ Always use `securityCoordinator.checkIntegrity()` for access control  
✅ Load creator manifest from secure vault  
✅ Use short-lived proof tokens  
✅ Log all security decisions  
✅ Test recovery paths before production  
✅ Rotate keys regularly  
✅ Monitor audit trail  
✅ Alert on policy changes  

---

## DON'Ts

❌ Hardcode secrets in code  
❌ Use raw keys as proof tokens  
❌ Skip security checks for non-creators  
❌ Store unencrypted private keys  
❌ Ignore audit trail  
❌ Forget to initialize before use  
❌ Make policy changes in production without testing  

---

## Policy Decision Matrix

```
Signature: VALID
└─ Decision: ALLOW ✓

Signature: INVALID + Normal User
├─ Mode: STRICT   → BLOCK ✗
├─ Mode: BALANCED → QUARANTINE (after threshold)
├─ Mode: RELAXED  → WARN (continue)
└─ Mode: RECOVERY → REPAIR

Signature: INVALID + Creator (authenticated)
├─ canBypassIntegrity: true  → REPAIR
├─ creatorOverride: true     → WARN/REPAIR
├─ recoveryEnabled: true     → Recovery available
└─ Otherwise                 → Apply standard enforcement
```

---

## Audit Trail Format

```json
{
  "timestamp": "2026-04-15T12:34:56Z",
  "userId": "user123",
  "isCreator": false,
  "component": "governance",
  "decision": "ALLOW|WARN|BLOCK|QUARANTINE|REPAIR",
  "reason": "Signature valid",
  "allowed": true,
  "shouldLog": true
}
```

---

## Checklist for Implementation

- [ ] Load creator manifest from secure vault
- [ ] Initialize security system during bootstrap
- [ ] Add integrity checks to GovernanceEngine
- [ ] Add integrity checks to TrustEngine
- [ ] Implement proof token loading
- [ ] Test all security decisions
- [ ] Test creator recovery flow
- [ ] Test policy switching
- [ ] Configure audit logging
- [ ] Deploy with monitoring
- [ ] Regular key rotation process
- [ ] Periodic audit trail review

---

## Support

- **Framework docs**: `SECURITY_FRAMEWORK.md`
- **Migration guide**: `TRANSFORMATION.md`
- **Code examples**: `security.init.ts`
- **Main interface**: `security.coordinator.ts`

---

## Key Numbers

| Setting | Default | Configurable |
|---------|---------|--------------|
| Token expiry | 1 hour | Per policy |
| Audit retention | 90 days | Per policy |
| Quarantine threshold | 5 | Per policy |
| Quarantine duration | 30 min | Per policy |
| Recovery timeout | Recovery mode | Per policy |

---

**Last Updated**: April 15, 2026  
**Version**: 1.0  
**Status**: Ready for integration  
**Principle**: Tamper-resistant for others, recoverable for founder
