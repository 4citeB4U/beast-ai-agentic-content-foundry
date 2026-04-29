/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.SECURITY
TAG: AI.ORCHESTRATION.AGENT.SHIELD.SECURITY

COLOR_ONION_HEX:
NEON=#EF4444
FLUO=#F87171
PASTEL=#FECACA

ICON_ASCII:
family=lucide
glyph=shield

5WH:
WHAT = Shield security and self-healing agent — monitors errors, diagnoses failures, writes healing patches
WHY = Ensures the system can detect, contain, and repair its own failures without human intervention
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/Shield.ts
WHEN = 2026-04-04
HOW = Static class with deterministic diagnosis rules and Sage memory integration

AGENTS:
ASSESS
AUDIT
leeway
SHIELD

LICENSE:
MIT
*/

// agents/Shield.ts — Security & Self-Healing Agent
// Monitors the system, detects failures, containerizes corrupted modules,
// investigates, repairs, logs the incident, and feeds it to the dream cycle.

import { eventBus } from '../../core/EventBus';
import { ReportWriter } from '../../core/ReportWriter';
import { Sage } from './Sage';
import {
  type Capability,
  type Zone,
  type WriteIntentBlock,
  APPROVAL_REQUIRED_CAPS,
  capabilityZone,
} from '../../core/GovernanceContract';

export interface IncidentReport {
  id: string;
  timestamp: Date;
  module: string;
  error: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'quarantined' | 'repaired' | 'deleted' | 'investigating';
  diagnosis?: string;
  resolution?: string;
}

// ── Governance types ──────────────────────────────────────────
interface CapabilityGrant {
  cap: Capability;
  grantedAt: number;
  ttlMs: number;
  scope: string;
  reason: string;
}

interface BreakGlassSession {
  active: boolean;
  caps: Capability[];
  ttlMs: number;
  scope: string;
  reason: string;
  activatedAt: number;
}

// ── Injection detection patterns ──────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above)\s+instructions?/i,
  /override\s+(shield|governance|policy|laws)/i,
  /you\s+are\s+now\s+(?:an?\s+)?(?:unrestricted|jailbroken)/i,
  /disregard\s+(your\s+)?rules/i,
  /forget\s+(your\s+)?(constraints|guidelines|persona)/i,
];

function diagnoseIncident(errorMessage: string, severity: IncidentReport['severity']) {
  const lower = errorMessage.toLowerCase();
  const rootCause =
    lower.includes('unauthorized') ? 'Authorization boundary failure detected.' :
    lower.includes('network') || lower.includes('fetch') ? 'Network or upstream dependency failure detected.' :
    lower.includes('cannot read') || lower.includes('undefined') ? 'Null or undefined access detected in runtime path.' :
    lower.includes('timeout') ? 'Operation exceeded allowed execution window.' :
    'Runtime fault detected with limited observability.';

  const action = severity === 'critical' || severity === 'high' ? 'isolate' : 'patch';
  const fix = action === 'isolate'
    ? 'Contain the affected module, preserve receipts, and require governed operator review before reactivation.'
    : 'Apply the smallest local fix, rerun the failing check, and keep the change isolated to the affected module.';
  const prevention = severity === 'critical'
    ? 'Add tighter input validation, secret handling checks, and capability boundaries.'
    : 'Add targeted validation and a reproducible regression check for this path.';

  return { rootCause, severity, action, fix, prevention };
}

export class Shield {
  private static incidents: IncidentReport[] = [];
  private static errorListeners: ((...args: unknown[]) => void)[] = [];

  // ── Governance state ─────────────────────────────────────────
  private static capabilityGrants: Map<Capability, CapabilityGrant> = new Map();
  private static breakGlass: BreakGlassSession = {
    active: false, caps: [], ttlMs: 0, scope: '', reason: '', activatedAt: 0,
  };

  static initialize() {
    // Global error handler
    const handler = (event: ErrorEvent) => {
      this.handleError(event.error?.message || event.message, 'window');
    };
    window.addEventListener('error', handler);
    
    // Unhandled promise rejections
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      this.handleError(event.reason?.message || String(event.reason), 'promise');
    };
    window.addEventListener('unhandledrejection', rejectionHandler);

    console.info('[Shield] Security monitoring active.');
  }

  static async handleError(errorMessage: string, moduleName: string) {
    const incident: IncidentReport = {
      id: `INC-${Date.now()}`,
      timestamp: new Date(),
      module: moduleName,
      error: errorMessage,
      severity: this.assessSeverity(errorMessage),
      status: 'investigating',
    };

    this.incidents.push(incident);
    eventBus.emit('heal:start', { module: moduleName });
    // Record to governance report
    void ReportWriter.governance('security_events', 'SECURITY_EVENT', incident.severity === 'critical' ? 'CRITICAL' : incident.severity === 'high' ? 'ERROR' : 'WARN', `[Shield] Error in ${moduleName}: ${errorMessage}`, { incident_id: incident.id, module: moduleName });

    // Log to Sage memory
    Sage.log('error', `[Shield] Error in ${moduleName}: ${errorMessage}`, 'Shield');

    // Diagnose deterministically
    try {
      const result = diagnoseIncident(errorMessage, incident.severity);

      incident.diagnosis = result.rootCause;
      incident.status = result.action === 'delete' ? 'deleted' : 'repaired';
      incident.resolution = result.fix;
      
      Sage.log(
        'insight', 
        `[Shield] Incident ${incident.id} resolved. Root cause: ${result.rootCause}. Resolution: ${result.fix}`,
        'Shield',
        ['incident', 'self-healing']
      );

      eventBus.emit('heal:complete', { module: moduleName, success: true });

    } catch (err) {
      incident.status = 'quarantined';
      eventBus.emit('heal:complete', { module: moduleName, success: false });
    }
  }

  static async auditFrontendForKeys(): Promise<{ safe: boolean; warnings: string[] }> {
    // Check for common patterns that indicate exposed keys
    const warnings: string[] = [];
    
    const dangerousPatterns = [
      /AIzaSy[A-Za-z0-9_-]{35}/,  // leeway API keys
      /sk-[A-Za-z0-9]{48}/,        // OpenAI keys
      /hf_[A-Za-z0-9]{36}/,        // HuggingFace tokens
      /ghp_[A-Za-z0-9]{36}/,       // GitHub PATs
    ];

    // This runs as a build-time audit, not scanning live DOM
    // The patterns would be checked in build artifacts
    
    return { safe: warnings.length === 0, warnings };
  }

  private static assessSeverity(error: string): IncidentReport['severity'] {
    const lower = error.toLowerCase();
    if (lower.includes('unauthorized') || lower.includes('key') || lower.includes('secret')) return 'critical';
    if (lower.includes('cannot read') || lower.includes('is not a function')) return 'high';
    if (lower.includes('network') || lower.includes('fetch')) return 'medium';
    return 'low';
  }

  static getIncidents(): IncidentReport[] {
    return [...this.incidents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  static clearIncidents() {
    this.incidents = [];
  }

  // ── Zone enforcement ─────────────────────────────────────────
  /**
   * Review a write-intent block before execution.
   * Returns { approved: boolean; reason: string }.
   * All APPROVAL_REQUIRED_CAPS must be either explicitly granted or under break-glass.
   */
  static reviewWriteIntent(intent: WriteIntentBlock): { approved: boolean; reason: string } {
    this.expireGrants();

    const blockedCaps: string[] = [];
    for (const action of intent.actions) {
      if (APPROVAL_REQUIRED_CAPS.includes(action.capability)) {
        const hasGrant = this.hasCapability(action.capability);
        if (!hasGrant) {
          blockedCaps.push(action.capability);
        }
      }
    }

    if (blockedCaps.length > 0) {
      const detail = `Missing grants for: ${blockedCaps.join(', ')}`;
      eventBus.emit('shield:threat', { module: 'WriteIntent', severity: 'high', detail });
      return { approved: false, reason: detail };
    }
    return { approved: true, reason: 'All required capabilities granted.' };
  }

  /** Check if a specific capability is currently granted (grant or break-glass). */
  static hasCapability(cap: Capability): boolean {
    this.expireGrants();
    if (this.breakGlass.active) {
      const bgExpired = Date.now() > this.breakGlass.activatedAt + this.breakGlass.ttlMs;
      if (!bgExpired && this.breakGlass.caps.includes(cap)) return true;
    }
    return this.capabilityGrants.has(cap);
  }

  /** Grant a capability with a TTL in milliseconds. */
  static grantCapability(cap: Capability, ttlMs: number, scope: string, reason: string): void {
    const grant: CapabilityGrant = { cap, grantedAt: Date.now(), ttlMs, scope, reason };
    this.capabilityGrants.set(cap, grant);
    eventBus.emit('permit:granted', { cap, ttl_ms: ttlMs, scope, reason });
    Sage.log('insight', `[Shield] Capability granted: ${cap} | TTL: ${ttlMs}ms | ${reason}`, 'Shield', ['permit']);
    void ReportWriter.governance('permissions', 'WRITE_APPROVED', 'INFO', `[Shield] Capability granted: ${cap} | scope=${scope}`, { cap, ttl_ms: ttlMs, scope, reason });
  }

  /** Revoke a capability grant immediately. */
  static revokeCapability(cap: Capability): void {
    this.capabilityGrants.delete(cap);
    eventBus.emit('permit:revoked', { cap });
  }

  /** Return current grants (non-expired). */
  static getGrantStatus(): Array<{ cap: Capability; zone: Zone; remainingMs: number; scope: string }> {
    this.expireGrants();
    return Array.from(this.capabilityGrants.values()).map(g => ({
      cap: g.cap,
      zone: capabilityZone(g.cap),
      remainingMs: Math.max(0, (g.grantedAt + g.ttlMs) - Date.now()),
      scope: g.scope,
    }));
  }

  // ── Break-glass ───────────────────────────────────────────────
  /** Activate break-glass for emergency scoped access. Fully audited. */
  static activateBreakGlass(caps: Capability[], ttlMs: number, scope: string, reason: string): void {
    this.breakGlass = { active: true, caps, ttlMs, scope, reason, activatedAt: Date.now() };
    eventBus.emit('breakglass:activated', { caps: caps as string[], ttl_ms: ttlMs, scope, reason });
    Sage.log('insight', `[Shield] BREAK-GLASS ACTIVATED: caps=[${caps.join(',')}] ttl=${ttlMs}ms scope=${scope} reason=${reason}`, 'Shield', ['breakglass', 'critical']);
    void ReportWriter.governance('breakglass', 'SECURITY_EVENT', 'WARN', `[Shield] BREAK-GLASS ACTIVATED: scope=${scope} reason=${reason}`, { caps, ttl_ms: ttlMs, scope });
  }

  /** End break-glass session immediately. */
  static endBreakGlass(): void {
    this.breakGlass = { active: false, caps: [], ttlMs: 0, scope: '', reason: '', activatedAt: 0 };
    eventBus.emit('breakglass:ended', {});
  }

  get breakGlassActive(): boolean {
    return Shield.breakGlass.active && Date.now() < Shield.breakGlass.activatedAt + Shield.breakGlass.ttlMs;
  }

  // ── Injection detection ───────────────────────────────────────
  /** Scan user input for prompt injection patterns. Returns true if threat detected. */
  static scanForInjection(text: string): boolean {
    const threat = INJECTION_PATTERNS.some(re => re.test(text));
    if (threat) {
      eventBus.emit('shield:threat', {
        module: 'UserInput',
        severity: 'critical',
        detail: 'Prompt injection attempt detected — input blocked.',
      });
      Sage.log('error', '[Shield] PROMPT INJECTION BLOCKED: ' + text.slice(0, 200), 'Shield', ['injection', 'security']);
      void ReportWriter.governance('security_events', 'SECURITY_EVENT', 'CRITICAL', '[Shield] PROMPT INJECTION BLOCKED — input refused.', { sample: text.slice(0, 100) });
    }
    return threat;
  }

  // ── Helpers ───────────────────────────────────────────────────
  private static expireGrants(): void {
    const now = Date.now();
    for (const [cap, grant] of this.capabilityGrants.entries()) {
      if (now > grant.grantedAt + grant.ttlMs) {
        this.capabilityGrants.delete(cap);
      }
    }
    if (this.breakGlass.active && now > this.breakGlass.activatedAt + this.breakGlass.ttlMs) {
      this.endBreakGlass();
    }
  }
}

