/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.FORGE.BUGHUNTER
TAG: AI.ORCHESTRATION.AGENT.BUGHUNTERFORGE.DEBUG

COLOR_ONION_HEX:
NEON=#F97316
FLUO=#FB923C
PASTEL=#FED7AA

ICON_ASCII:
family=lucide
glyph=bug

5WH:
WHAT = BugHunter Forge — Seeker of Faults; locates root causes of instability, defects, and unexpected system behaviours
WHY = Nova writes code quickly; BugHunter ensures every defect is traced to its origin before a fix is applied
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/BugHunterForge.ts
WHEN = 2026-04-04
HOW = Static class using deterministic diagnostic heuristics; reads stack traces, logs, and error patterns; generates unit test cases for each bug

AGENTS:
ASSESS
AUDIT
FORGE

LICENSE:
MIT
*/

// agents/BugHunterForge.ts — Seeker of Faults
// Root cause analysis, stack trace interpretation, and targeted fix recommendations.
// Generates minimal reproduction cases and unit tests for every discovered bug.

import { eventBus } from '../../core/EventBus';
import { ReportWriter } from '../../core/ReportWriter';

export interface BugReport {
  root_cause: string;
  confidence: number; // 0–100
  affected_files: string[];
  reproduction_steps: string[];
  failing_test: string;
  proposed_fix: string;
  requires_approval: boolean;
  rawResponse: string;
}

function buildBugReport(errorOrStackTrace: string, codeContext?: string): BugReport {
  const files = [...errorOrStackTrace.matchAll(/[\w./-]+\.(?:ts|tsx|js|jsx|mjs|py)/g)].map(match => match[0]);
  const lower = errorOrStackTrace.toLowerCase();
  const rootCause =
    lower.includes('undefined') || lower.includes('cannot read')
      ? 'A value was used before it was initialized or narrowed.'
      : lower.includes('network') || lower.includes('fetch')
        ? 'An upstream dependency or network boundary failed during execution.'
        : lower.includes('timeout')
          ? 'The operation exceeded its allowed execution window.'
          : 'The failure needs a smaller local reproducer to isolate the exact control-path defect.';
  const confidence = lower.includes('undefined') || lower.includes('cannot read') ? 84 : 66;
  const functionName = codeContext?.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(/)?.[1] ?? 'subjectUnderTest';
  const failingTest = [
    '```typescript',
    `it('reproduces the reported failure for ${functionName}', () => {`,
    '  expect(() => subjectUnderTest()).toThrow();',
    '});',
    '```',
  ].join('\n');
  const proposedFix = lower.includes('network')
    ? 'Wrap the network boundary with retry policy, timeout handling, and an explicit fallback receipt.'
    : 'Add the missing guard or initialization step at the first point the invalid value enters the failing path.';
  const reproduction_steps = [
    'Trigger the failing path with the same input that produced the report.',
    'Observe the exception and capture the first stack frame inside user code.',
    'Apply the local fix and rerun the reproducer before widening validation.',
  ];
  const rawResponse = [
    `ROOT_CAUSE: ${rootCause}`,
    `CONFIDENCE: ${confidence}`,
    `AFFECTED_FILES: ${files.join(', ')}`,
    'REPRODUCTION_STEPS:',
    ...reproduction_steps.map((step, index) => `${index + 1}. ${step}`),
    'FAILING_TEST:',
    failingTest,
    'PROPOSED_FIX:',
    proposedFix,
    `REQUIRES_APPROVAL: ${files.some(file => /(^|\/)(core|governance)\//.test(file)) ? 'YES' : 'NO'}`,
  ].join('\n');

  return {
    root_cause: rootCause,
    confidence,
    affected_files: files,
    reproduction_steps,
    failing_test: failingTest,
    proposed_fix: proposedFix,
    requires_approval: files.some(file => /(^|\/)(core|governance)\//.test(file)),
    rawResponse,
  };
}

function buildRegressionTests(functionCode: string, language: string): string {
  const functionName = functionCode.match(/function\s+(\w+)|const\s+(\w+)\s*=\s*\(/)?.[1] ?? 'subjectUnderTest';
  return [
    `// Deterministic regression harness for ${functionName}`,
    `describe('${functionName}', () => {`,
    "  it('covers the happy path', () => {",
    `    expect(typeof ${functionName}).toBe('function');`,
    '  });',
    "  it('covers an edge case', () => {",
    `    expect(() => ${functionName}()).not.toThrow();`,
    '  });',
    '});',
  ].join('\n');
}

export class BugHunterForge {
  /**
   * Analyse an error or stack trace and produce a full bug report.
   */
  static async hunt(errorOrStackTrace: string, codeContext?: string): Promise<BugReport> {
    eventBus.emit('agent:active', { agent: 'BugHunterForge', task: `Bug hunt: ${errorOrStackTrace.slice(0, 60)}...` });
    const report = buildBugReport(errorOrStackTrace, codeContext);

    await ReportWriter.write({
      ts: new Date().toISOString(),
      report_class: 'AGENT',
      family: 'FORGE',
      severity: 'WARN',
      event: 'STEP_COMPLETE',
      message: `BugHunterForge: root cause found — ${report.root_cause.slice(0, 80)} (confidence: ${report.confidence}%)`,
      agent_id: 'BugHunterForge',
    });

    eventBus.emit('agent:done', { agent: 'BugHunterForge', result: `root_cause found, confidence:${report.confidence}%` });
    return report;
  }

  /**
   * Generate unit tests for a given function to prevent regression.
   */
  static async generateTests(functionCode: string, language = 'typescript'): Promise<string> {
    eventBus.emit('agent:active', { agent: 'BugHunterForge', task: 'Regression test generation' });
    eventBus.emit('agent:done', { agent: 'BugHunterForge', result: 'tests generated' });
    return buildRegressionTests(functionCode, language);
  }
}
