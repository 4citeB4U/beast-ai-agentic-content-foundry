/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.FORGE.SYNTAX
TAG: AI.ORCHESTRATION.AGENT.SYNTAXFORGE.ARCHITECTURE

COLOR_ONION_HEX:
NEON=#F97316
FLUO=#FB923C
PASTEL=#FED7AA

ICON_ASCII:
family=lucide
glyph=code

5WH:
WHAT = Syntax Forge — Architect of Code; ensures architectural integrity, code structure quality, and design pattern consistency across all generated code
WHY = Nova generates fast; Syntax Forge ensures what is generated is maintainable, correctly structured, and follows LeeWay standards
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/SyntaxForge.ts
WHEN = 2026-04-04
HOW = Static class using deterministic review heuristics; reviews code structure, naming, imports, and design patterns

AGENTS:
ASSESS
AUDIT
FORGE

LICENSE:
MIT
*/

// agents/SyntaxForge.ts — Architect of Code
// Code architecture reviewer and structural designer.
// Reviews Nova's output for maintainability, pattern correctness, and LeeWay header compliance.

import { eventBus } from '../../core/EventBus';
import { ReportWriter } from '../../core/ReportWriter';

export type IssueSeverity = 'INFO' | 'WARN' | 'ERROR' | 'SECURITY_CRITICAL';

export interface ArchitectureIssue {
  file?: string;
  line?: number;
  severity: IssueSeverity;
  category: string;
  description: string;
  recommendation: string;
}

export interface ArchitectureReview {
  score: number; // 0–100
  issues: ArchitectureIssue[];
  summary: string;
  rawResponse: string;
}

function reviewCodeDeterministically(code: string, filename?: string): ArchitectureReview {
  const issues: ArchitectureIssue[] = [];

  if ((filename?.endsWith('.ts') || filename?.endsWith('.tsx')) && !code.includes('LEEWAY HEADER')) {
    issues.push({
      severity: 'WARN',
      category: 'header',
      description: 'Missing LEEWAY HEADER in a TypeScript source file.',
      recommendation: 'Add the standard LeeWay header block at the top of the file.',
    });
  }

  if (/\bany\b/.test(code)) {
    issues.push({
      severity: 'WARN',
      category: 'types',
      description: 'Found use of the any type.',
      recommendation: 'Replace any with explicit domain types or unknown plus narrowing.',
    });
  }

  if (/TODO|FIXME/.test(code)) {
    issues.push({
      severity: 'INFO',
      category: 'structure',
      description: 'Found unresolved TODO/FIXME markers.',
      recommendation: 'Convert placeholders into tracked tasks or finish the implementation path.',
    });
  }

  if (/AIzaSy|sk-[A-Za-z0-9]|ghp_[A-Za-z0-9]|hf_[A-Za-z0-9]/.test(code)) {
    issues.push({
      severity: 'SECURITY_CRITICAL',
      category: 'security',
      description: 'Possible credential or token-like literal detected.',
      recommendation: 'Move secrets into approved environment or secret storage and rotate compromised values.',
    });
  }

  if (/console\.log\(/.test(code)) {
    issues.push({
      severity: 'INFO',
      category: 'pattern',
      description: 'Found direct console logging in source.',
      recommendation: 'Prefer structured reporting or governance-aware logging where auditability matters.',
    });
  }

  const score = Math.max(0, 100 - issues.reduce((total, issue) => {
    if (issue.severity === 'SECURITY_CRITICAL') return total + 35;
    if (issue.severity === 'ERROR') return total + 20;
    if (issue.severity === 'WARN') return total + 10;
    return total + 4;
  }, 0));

  const summary = issues.length === 0
    ? 'Deterministic review found no major architectural or standards violations.'
    : `Deterministic review found ${issues.length} issue(s). Highest severity: ${issues[0].severity}.`;

  const rawResponse = [
    `SCORE: ${score}`,
    `SUMMARY: ${summary}`,
    'ISSUES:',
    ...issues.map(issue => [
      `SEVERITY: ${issue.severity}`,
      `CATEGORY: ${issue.category}`,
      `DESCRIPTION: ${issue.description}`,
      `RECOMMENDATION: ${issue.recommendation}`,
      '---',
    ].join('\n')),
  ].join('\n');

  return { score, issues, summary, rawResponse };
}

function buildDesignPlan(requirement: string): string {
  return [
    `Requirement: ${requirement}`,
    '1. File structure',
    '   - src/features/<feature>/index.ts',
    '   - src/features/<feature>/contracts.ts',
    '   - src/features/<feature>/service.ts',
    '2. Responsibilities',
    '   - Keep contracts isolated from runtime orchestration.',
    '   - Route side effects through one service boundary.',
    '   - Expose deterministic functions for validation and testing.',
    '3. Method signatures',
    '   - createFeaturePlan(input: string): FeaturePlan',
    '   - executeFeatureStep(stepId: string): Promise<ExecutionReceipt>',
    '4. Data flow',
    '   Input -> Validation -> Deterministic Plan -> Governed Execution -> Receipt',
    '5. Dependency notes',
    '   - Prefer standards core utilities over new runtime adapters.',
    '   - Keep state transitions explicit and verifiable.',
  ].join('\n');
}

export class SyntaxForge {
  /**
   * Review code for architectural quality and LeeWay standards compliance.
   */
  static async review(code: string, filename?: string): Promise<ArchitectureReview> {
    eventBus.emit('agent:active', { agent: 'SyntaxForge', task: `Code review: ${filename ?? 'unnamed file'}` });
    const review = reviewCodeDeterministically(code, filename);

    const reportSeverity = review.issues.some(i => i.severity === 'SECURITY_CRITICAL' || i.severity === 'ERROR')
      ? 'ERROR'
      : review.issues.some(i => i.severity === 'WARN') ? 'WARN' : 'INFO';

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: 'FORGE',
      severity: reportSeverity,
      event: 'STEP_COMPLETE',
      message: `SyntaxForge review: score ${review.score}/100 — ${review.issues.length} issue(s)${filename ? ` in ${filename}` : ''}`,
      agent_id: 'SyntaxForge',
    });

    eventBus.emit('agent:done', { agent: 'SyntaxForge', result: `score:${review.score}` });
    return review;
  }

  /**
   * Design the high-level architecture for a new feature or system.
   */
  static async design(requirement: string): Promise<string> {
    eventBus.emit('agent:active', { agent: 'SyntaxForge', task: `Architecture design: ${requirement.slice(0, 60)}` });
    eventBus.emit('agent:done', { agent: 'SyntaxForge', result: 'design complete' });
    return buildDesignPlan(requirement);
  }
}
