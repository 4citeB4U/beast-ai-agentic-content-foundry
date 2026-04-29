/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.GOVERNANCE.LIBRARIAN
TAG: AI.ORCHESTRATION.AGENT.LIBRARIANAEIGIS.DOCS

COLOR_ONION_HEX:
NEON=#8B5CF6
FLUO=#A78BFA
PASTEL=#DDD6FE

ICON_ASCII:
family=lucide
glyph=book-open

5WH:
WHAT = Librarian Aegis — Documentation Governance Officer; enforces docs/ taxonomy and detects drift
WHY = Without a librarian, markdown sprawls outside docs/ and loses classification, making audits impossible
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/LibrarianAegis.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
AEGIS

LICENSE:
MIT
*/

// agents/LibrarianAegis.ts
// Documentation Governance Officer — enforces docs/ taxonomy and validates doc-class headers.
// Cannot delete or modify docs; only proposes and requires explicit Lee Prime approval for file edits.

import { ReportWriter } from '../../core/ReportWriter';
import { eventBus } from '../../core/EventBus';

const AGENT_ID = 'Librarian_Aegis';
const FAMILY   = 'AEGIS' as const;

// ── Doc taxonomy ──────────────────────────────────────────────
export type DocClass = 'CANON' | 'ARCHITECTURE' | 'GOVERNANCE' | 'OPERATIONS' | 'EVALUATION' | 'REFERENCE';

export const DOC_CLASS_FOLDERS: Record<DocClass, string> = {
  CANON:        'docs/canon/',
  ARCHITECTURE: 'docs/architecture/',
  GOVERNANCE:   'docs/governance/',
  OPERATIONS:   'docs/operations/',
  EVALUATION:   'docs/evaluation/',
  REFERENCE:    'docs/reference/',
};

// Known doc paths that are exceptions to the "must live in docs/" rule
export const EXCLUDED_PATHS = [
  'README.md',
  'system_reports/',
  'LeeWay-Standards/',
  'MCP agents/',
];

// Required header fields (DOC_CLASS, DOC_ID, OWNER, LAST_UPDATED)
const HEADER_REGEX = /<!--[\s\S]*?DOC_CLASS:\s*(\w+)[\s\S]*?DOC_ID:\s*([\w.-]+)[\s\S]*?OWNER:\s*([^\n]+)[\s\S]*?LAST_UPDATED:\s*([\d-]+)[\s\S]*?-->/;

export interface DocDriftItem {
  path: string;
  issue: 'missing_header' | 'wrong_folder' | 'missing_doc_class' | 'stale';
  current_class?: DocClass;
  expected_folder?: string;
  suggested_action: string;
}

export interface DocsAuditReport {
  generated_at: string;
  files_checked: number;
  drift_count: number;
  drift_items: DocDriftItem[];
  compliant_count: number;
  recommendation: string;
}

export class LibrarianAegis {
  private static initialized = false;

  static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    console.info('[LibrarianAegis] Documentation governance active.');
  }

  /**
   * Validate a doc file's content for a proper DOC_CLASS header.
   * Returns null if valid, or the issue description.
   */
  static validateHeader(content: string, filePath: string): DocDriftItem | null {
    const match = content.match(HEADER_REGEX);
    if (!match) {
      return {
        path: filePath,
        issue: 'missing_header',
        suggested_action: `Add DOC_CLASS header to ${filePath} — see docs/reference/report-schema.md for format.`,
      };
    }

    const docClass = match[1] as DocClass;
    const expectedFolder = DOC_CLASS_FOLDERS[docClass];
    if (expectedFolder && !filePath.replace(/\\/g, '/').includes(expectedFolder)) {
      return {
        path: filePath,
        issue: 'wrong_folder',
        current_class: docClass,
        expected_folder: expectedFolder,
        suggested_action: `Move ${filePath} to ${expectedFolder}. Use /lee.execute to approve the move.`,
      };
    }

    // Check staleness (LAST_UPDATED older than 180 days)
    const lastUpdated = match[4];
    if (lastUpdated) {
      const updatedMs = new Date(lastUpdated).getTime();
      const staleMs = 180 * 24 * 60 * 60 * 1000;
      if (Date.now() - updatedMs > staleMs) {
        return {
          path: filePath,
          issue: 'stale',
          current_class: docClass,
          suggested_action: `Update LAST_UPDATED in ${filePath} — last updated ${lastUpdated}.`,
        };
      }
    }

    return null;
  }

  /**
   * Scan a list of known doc paths (provided by MCP or manual list).
   * Returns an audit report. All proposals require Lee Prime approval before action.
   */
  static async auditDocs(
    knownFiles: Array<{ path: string; content: string }>,
  ): Promise<DocsAuditReport> {
    const driftItems: DocDriftItem[] = [];

    for (const file of knownFiles) {
      // Skip excluded paths
      if (EXCLUDED_PATHS.some(exc => file.path.startsWith(exc))) continue;
      if (!file.path.endsWith('.md')) continue;

      const issue = this.validateHeader(file.content, file.path);
      if (issue) driftItems.push(issue);
    }

    const report: DocsAuditReport = {
      generated_at: new Date().toISOString(),
      files_checked: knownFiles.length,
      drift_count: driftItems.length,
      drift_items: driftItems,
      compliant_count: knownFiles.length - driftItems.length,
      recommendation: driftItems.length === 0
        ? 'All checked docs are compliant.'
        : `${driftItems.length} docs have drift. Review and approve moves via /lee.execute.`,
    };

    // Write audit to governance report
    await ReportWriter.governance(
      'docs_audit',
      driftItems.length > 0 ? 'DOCS_DRIFT_DETECTED' : 'STEP_COMPLETE',
      driftItems.length > 0 ? 'WARN' : 'INFO',
      `[LibrarianAegis] Docs audit: ${report.files_checked} checked, ${driftItems.length} drift items.`,
      { report },
    );

    if (driftItems.length > 0) {
      eventBus.emit('report:written', {
        key: 'reports:system/governance/docs_audit.ndjson',
        event: {
          ts: new Date().toISOString(),
          report_class: 'GOVERNANCE' as const,
          family: FAMILY,
          agent_id: AGENT_ID,
          severity: 'WARN' as const,
          event: 'DOCS_PROPOSAL_READY' as const,
          message: `[LibrarianAegis] ${driftItems.length} doc drift items detected. Proposals ready for Lee Prime review.`,
          data: { driftItems },
          next: 'Lee Prime: review drift items and use /lee.execute to approve corrections.',
        },
      });
    }

    return report;
  }

  /** Audit the repo's known top-level .md files for compliance. */
  static async auditKnownRepoFiles(): Promise<DocsAuditReport> {
    // These are the known canonical files in the repo root that should be moved to docs/
    const knownRepoRootMds = [
      'AGENT_LEE_3_MASTER_PLAN.md',
      'AGENT_LEE_SYSTEM_EVALUATION_2026-04-01.md',
      'AGENT_LEE_WORLD_SITREP.md',
      'AGentLeeBibile.md',
      'FULL_STACK_AGENT_MANIFEST.md',
      'THE_AGENT_LEE_MANIFESTO.md',
    ];

    const driftItems: DocDriftItem[] = knownRepoRootMds.map(path => ({
      path,
      issue: 'wrong_folder' as const,
      suggested_action: `Move ${path} to appropriate docs/ subfolder and add DOC_CLASS header.`,
    }));

    const report: DocsAuditReport = {
      generated_at: new Date().toISOString(),
      files_checked: knownRepoRootMds.length,
      drift_count: driftItems.length,
      drift_items: driftItems,
      compliant_count: 0,
      recommendation: 'All top-level .md files should be moved to docs/. See docs/README.md for taxonomy. Use /lee.execute to approve moves.',
    };

    await ReportWriter.governance(
      'docs_audit',
      'DOCS_DRIFT_DETECTED',
      'WARN',
      `[LibrarianAegis] Repo root markdown drift: ${driftItems.length} files outside docs/ taxonomy.`,
      { report },
    );

    return report;
  }

  /** Generate a docs index proposal (for docs/reference/docs-index.md). */
  static async generateDocsIndex(
    knownFiles: Array<{ path: string; docClass?: string; docId?: string }>,
  ): Promise<string> {
    const grouped: Record<string, typeof knownFiles> = {};
    for (const f of knownFiles) {
      const key = f.docClass ?? 'UNCLASSIFIED';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(f);
    }

    const lines: string[] = [
      '<!--',
      'DOC_CLASS: REFERENCE',
      'DOC_ID: reference.docs-index',
      'OWNER: Librarian Aegis',
      `LAST_UPDATED: ${new Date().toISOString().slice(0, 10)}`,
      '-->',
      '',
      '# Docs Index (auto-generated by Librarian Aegis)',
      '',
      `> Generated: ${new Date().toISOString()}`,
      '',
    ];

    for (const [cls, files] of Object.entries(grouped)) {
      lines.push(`## ${cls}`);
      for (const f of files) {
        lines.push(`- [${f.docId ?? f.path}](${f.path})`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /** Generate a leeway-powered summary of current doc health. */
  static async docHealthSummary(report: DocsAuditReport): Promise<string> {
    return `Docs audit: ${report.files_checked} checked, ${report.drift_count} drift items, ${report.compliant_count} compliant. Top drift: ${report.drift_items.slice(0, 3).map(item => `${item.path} (${item.issue})`).join(', ') || 'none'}.`;
  }

  /** Log boot. */
  static async boot(): Promise<void> {
    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: FAMILY,
      agent_id: AGENT_ID,
      severity: 'INFO',
      event: 'BOOT',
      message: '[LibrarianAegis] Documentation Governance Officer initialized.',
    });
  }
}

