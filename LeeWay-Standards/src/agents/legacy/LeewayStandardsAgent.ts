/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.GOVERNANCE.LEEWAY_STANDARDS
TAG: AI.ORCHESTRATION.AGENT.LEEWAYSTANDARDS.GOVERNANCE

COLOR_ONION_HEX:
NEON=#39FF14
FLUO=#0DFF94
PASTEL=#C7FFD8

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = LeewayStandardsAgent — bridges the LeeWay-Standards SDK agents into the Agent Lee governance system
WHY = Core system files must continuously comply with Leeway header, tag, placement, and policy standards;
      this agent enforces that law in-process and writes findings to the governance report system
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/LeewayStandardsAgent.ts
WHEN = 2026-04-04
      audits in-system known files, emits compliance events on EventBus, writes GOVERNANCE reports via ReportWriter.
      Works alongside LibrarianAegis (docs), JanitorSentinel (retention), ClerkArchive (archive), MarshalVerify (governance readiness).
      LeeWay-Standards JS agents (AuditAgent, AssessAgent, etc.) run as Node CLI tools;
      this agent reads their output from MemoryDB and surfaces findings to the system.

AGENTS:
ASSESS
AUDIT
ALIGN
DOCTOR
POLICY
HEADER
SYNTAX

LICENSE:
MIT
*/

// agents/LeewayStandardsAgent.ts
// LeeWay Standards Compliance Bridge — enforces Leeway coding standards across the Agent Lee codebase.
// Surfaces compliance findings to the governance report system and EventBus.
// Zero Node.js FS calls — safe for browser runtime.

import { ReportWriter } from '../../core/ReportWriter';
import { eventBus } from '../../core/EventBus';
import { MemoryDB } from '../../core/MemoryDB';

const AGENT_ID = 'LeewayStandardsAgent';
const FAMILY = 'AEGIS' as const;

// ── Leeway Compliance Policies (from LeeWay-Standards/.leeway/config.json) ──
export const LEEWAY_POLICIES = {
  NO_SECRETS_IN_CODE:   { description: 'No hardcoded secrets or credentials in source files', enforced: true, severity: 'CRITICAL' as const },
  HEADERS_REQUIRED:     { description: 'All code files must have a valid LEEWAY header block', enforced: true, severity: 'WARN' as const },
  TAGS_REQUIRED:        { description: 'All code files must have valid TAG field in header', enforced: true, severity: 'WARN' as const },
  NO_CIRCULAR_DEPS:     { description: 'No circular module dependencies allowed', enforced: true, severity: 'ERROR' as const },
  NAMING_CONVENTIONS:   { description: 'Files must follow Leeway naming conventions', enforced: false, severity: 'INFO' as const },
  PLACEMENT_RULES:      { description: 'Files must reside in their canonical directories', enforced: false, severity: 'INFO' as const },
  MINIMUM_COMPLIANCE:   { description: 'Overall compliance score must be ≥ 60', enforced: true, severity: 'WARN' as const },
} as const;

export type LeewayPolicy = keyof typeof LEEWAY_POLICIES;

// ── Compliance finding ────────────────────────────────────────
export interface ComplianceFinding {
  file: string;
  policy: LeewayPolicy;
  message: string;
  severity: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  line?: number;
}

// ── Compliance snapshot stored in MemoryDB ────────────────────
export interface ComplianceSnapshot {
  generated_at: string;
  agent: 'LeewayStandardsAgent';
  total_files_known: number;
  compliant_count: number;
  violation_count: number;
  overall_score: number;
  findings: ComplianceFinding[];
  policies_enforced: string[];
  recommendation: string;
}

const DB_KEY = 'leeway_standards_snapshot';
const KNOWN_FILES_KEY = 'leeway_standards_known_files';

// ── Built-in in-browser compliance checks ────────────────────
// These run in-process against file metadata provided by other agents / CLI tools.

/** Check if a file content string has a valid LEEWAY header block. */
export function hasLeewayHeader(content: string): boolean {
  return /\/\*\s*LEEWAY HEADER[\s\S]{10,}HOW\s*=/.test(content);
}

/** Check if a file content string has a valid TAG field in its header. */
export function hasLeewayTag(content: string): boolean {
  return /TAG:\s*\S+/.test(content);
}

/** Scan content for hardcoded secret patterns (conservative). */
export function hasSecretPattern(content: string): boolean {
  const patterns = [
    /['"]AIza[0-9A-Za-z_-]{35}['"]/,              // leeway API key
    /['"]sk-[a-zA-Z0-9]{32,}['"]/,                // OpenAI key
    /password\s*=\s*['"][^'"]{6,}['"]/i,
    /secret\s*=\s*['"][^'"]{8,}['"]/i,
    /api_key\s*=\s*['"][^'"]{8,}['"]/i,
  ];
  return patterns.some(p => p.test(content));
}

// ── LeewayStandardsAgent ──────────────────────────────────────
export class LeewayStandardsAgent {
  private static initialized = false;
  private static lastSnapshot: ComplianceSnapshot | null = null;

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    console.info('[LeewayStandardsAgent] Leeway Standards compliance bridge initialized.');
  }

  /**
   * Boot — log to governance, register active policies, load last snapshot.
   */
  static async boot(): Promise<void> {
    this.initialize();

    const enforcedPolicies = Object.entries(LEEWAY_POLICIES)
      .filter(([, p]) => p.enforced)
      .map(([k]) => k);

    await ReportWriter.governance(
      'security_events',
      'BOOT',
      'INFO',
      `[LeewayStandardsAgent] Leeway Standards Compliance Bridge online. Enforcing: ${enforcedPolicies.join(', ')}.`,
      { policies: LEEWAY_POLICIES, agent_id: AGENT_ID, family: FAMILY },
    );

    eventBus.emit('agent:active', {
      agent: AGENT_ID,
      task: `Standards compliance bridge active — ${enforcedPolicies.length} policies enforced`,
    });

    // Load previously stored snapshot from MemoryDB
    const stored = await MemoryDB.get<ComplianceSnapshot>(DB_KEY);
    if (stored) {
      this.lastSnapshot = stored;
      const age = Date.now() - new Date(stored.generated_at).getTime();
      const ageMinutes = Math.round(age / 60000);
      console.info(`[LeewayStandardsAgent] Last snapshot: ${stored.overall_score}% compliance (${ageMinutes}m ago).`);
    }
  }

  /**
   * Record a compliance snapshot from an external LeeWay-Standards CLI audit.
   * Call this after running: `node LeeWay-Standards/src/agents/orchestration/doctor-agent.js`
   * and passing the result here.
   */
  static async recordAuditResult(result: {
    totalFiles: number;
    compliantFiles: number;
    findings: ComplianceFinding[];
    overallScore: number;
  }): Promise<ComplianceSnapshot> {
    const snapshot: ComplianceSnapshot = {
      generated_at: new Date().toISOString(),
      agent: 'LeewayStandardsAgent',
      total_files_known: result.totalFiles,
      compliant_count: result.compliantFiles,
      violation_count: result.findings.length,
      overall_score: result.overallScore,
      findings: result.findings,
      policies_enforced: Object.entries(LEEWAY_POLICIES)
        .filter(([, p]) => p.enforced)
        .map(([k]) => k),
      recommendation: result.overallScore >= 80
        ? 'Codebase is well-compliant with Leeway standards.'
        : result.overallScore >= 60
          ? 'Minor compliance gaps — review findings and add missing headers.'
          : 'Critical compliance failures — run header-agent and audit-agent immediately.',
    };

    this.lastSnapshot = snapshot;
    await MemoryDB.set(DB_KEY, snapshot);

    const severity = result.overallScore >= 80 ? 'INFO' : result.overallScore >= 60 ? 'WARN' : 'ERROR';
    await ReportWriter.governance(
      'docs_audit',
      result.findings.length > 0 ? 'DOCS_DRIFT_DETECTED' : 'STEP_COMPLETE',
      severity as 'INFO' | 'WARN' | 'ERROR',
      `[LeewayStandardsAgent] Audit complete — ${result.overallScore}% compliance. ${result.findings.length} violations across ${result.totalFiles} files.`,
      { snapshot },
    );

    eventBus.emit('agent:active', {
      agent: AGENT_ID,
      task: `Audit complete — ${result.overallScore}% compliance, ${result.findings.length} violations`,
    });

    if (result.overallScore < 60) {
      eventBus.emit('agent:error', {
        agent: AGENT_ID,
        error: `Leeway compliance below minimum (60): ${result.overallScore}%. Immediate action required.`,
      });
    } else if (result.overallScore < 80) {
      eventBus.emit('agent:done', {
        agent: AGENT_ID,
        result: `Compliance audit: ${result.overallScore}%  — ${result.findings.length} warnings.`,
      });
    } else {
      eventBus.emit('agent:done', {
        agent: AGENT_ID,
        result: `Compliance audit: ${result.overallScore}% — all critical policies met.`,
      });
    }

    eventBus.emit('standards:compliance', {
      score: snapshot.overall_score,
      violations: snapshot.violation_count,
      total_files: snapshot.total_files_known,
      recommendation: snapshot.recommendation,
    });

    return snapshot;
  }

  /**
   * In-process quick check — scans a set of {path, content} file records.
   * Safe for browser — no Node.js FS calls.
   */
  static async quickScan(
    files: Array<{ path: string; content: string }>,
  ): Promise<ComplianceSnapshot> {
    const findings: ComplianceFinding[] = [];
    let compliantCount = 0;

    const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
    const codeFiles = files.filter(f =>
      codeExtensions.has(f.path.substring(f.path.lastIndexOf('.'))),
    );

    for (const file of codeFiles) {
      const fileFindingsCount = findings.length;

      if (!hasLeewayHeader(file.content)) {
        findings.push({
          file: file.path,
          policy: 'HEADERS_REQUIRED',
          message: `Missing LEEWAY header block in ${file.path}`,
          severity: 'WARN',
        });
      }

      if (!hasLeewayTag(file.content)) {
        findings.push({
          file: file.path,
          policy: 'TAGS_REQUIRED',
          message: `Missing TAG field in header of ${file.path}`,
          severity: 'WARN',
        });
      }

      if (hasSecretPattern(file.content)) {
        findings.push({
          file: file.path,
          policy: 'NO_SECRETS_IN_CODE',
          message: `Potential hardcoded secret pattern detected in ${file.path}`,
          severity: 'CRITICAL',
        });
      }

      if (findings.length === fileFindingsCount) compliantCount++;
    }

    const totalFiles = codeFiles.length;
    const overallScore = totalFiles === 0 ? 100
      : Math.round((compliantCount / totalFiles) * 100);

    return this.recordAuditResult({
      totalFiles,
      compliantFiles: compliantCount,
      findings,
      overallScore,
    });
  }

  /**
   * Validate a single file in-process.
   * Returns array of findings (empty = compliant).
   */
  static validateFile(path: string, content: string): ComplianceFinding[] {
    const findings: ComplianceFinding[] = [];

    if (!hasLeewayHeader(content)) {
      findings.push({
        file: path,
        policy: 'HEADERS_REQUIRED',
        message: `Missing LEEWAY header block. Add /*\\nLEEWAY HEADER — DO NOT REMOVE\\n...\\n*/`,
        severity: 'WARN',
      });
    }

    if (!hasLeewayTag(content)) {
      findings.push({
        file: path,
        policy: 'TAGS_REQUIRED',
        message: `Missing TAG: field in LEEWAY header.`,
        severity: 'WARN',
      });
    }

    if (hasSecretPattern(content)) {
      findings.push({
        file: path,
        policy: 'NO_SECRETS_IN_CODE',
        message: `Potential hardcoded secret pattern detected.`,
        severity: 'CRITICAL',
      });
    }

    return findings;
  }

  /**
   * Store a list of known files (from CLI tool output) in MemoryDB.
   * Allows the browser system to track which files have been assessed.
   */
  static async storeKnownFiles(files: string[]): Promise<void> {
    await MemoryDB.set(KNOWN_FILES_KEY, { files, updated_at: new Date().toISOString() });
  }

  static getLastSnapshot(): ComplianceSnapshot | null {
    return this.lastSnapshot;
  }

  /**
   * Report current policy status to EventBus — useful for Diagnostics page subscriptions.
   */
  static reportPolicyStatus(): void {
    const snapshot = this.lastSnapshot;
    const score = snapshot ? snapshot.overall_score : null;
    eventBus.emit('agent:active', {
      agent: AGENT_ID,
      task: score !== null
        ? `Leeway compliance: ${score}% | Policies: ${Object.keys(LEEWAY_POLICIES).filter(k => LEEWAY_POLICIES[k as LeewayPolicy].enforced).join(', ')}`
        : 'Leeway compliance: no audit run yet. Policies loaded and enforced.',
    });
  }
}

