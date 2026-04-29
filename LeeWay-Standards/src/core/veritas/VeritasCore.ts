/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.VERITAS.VALIDATION.CORE
DESCRIPTION: Deterministic result validation and policy gate for cognition cycle outputs.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

export type ValidationIssue = {
  code: string;
  message: string;
  severity: 'info' | 'warn' | 'error';
};

export type ValidationResult = {
  passed: boolean;
  score: number;
  issues: ValidationIssue[];
};

function checkNonEmptyResults(results: unknown): ValidationIssue[] {
  if (!results || typeof results !== 'object' || Object.keys(results as object).length === 0) {
    return [
      {
        code: 'EMPTY_RESULTS',
        message: 'Execution produced no results.',
        severity: 'error',
      },
    ];
  }
  return [];
}

function checkPlanExecuted(plan: unknown): ValidationIssue[] {
  if (!Array.isArray(plan) || plan.length === 0) {
    return [
      {
        code: 'NO_PLAN',
        message: 'No plan was generated before execution.',
        severity: 'error',
      },
    ];
  }
  return [];
}

function checkRequiredFields(results: any): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!results?.summary) {
    issues.push({
      code: 'MISSING_SUMMARY',
      message: 'Result missing summary.',
      severity: 'warn',
    });
  }
  if (!results?.answer) {
    issues.push({
      code: 'MISSING_ANSWER',
      message: 'Result missing answer content.',
      severity: 'warn',
    });
  }
  return issues;
}

function checkPolicy(input: string): ValidationIssue[] {
  const lower = input.toLowerCase();
  const blocked = ['delete all', 'wipe everything', 'self destruct'];
  for (const phrase of blocked) {
    if (lower.includes(phrase)) {
      return [
        {
          code: 'POLICY_BLOCK',
          message: `Dangerous operation detected: "${phrase}".`,
          severity: 'error',
        },
      ];
    }
  }
  return [];
}

function scoreFromIssues(issues: ValidationIssue[]): number {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'error') score -= 40;
    if (issue.severity === 'warn') score -= 10;
  }
  return Math.max(0, score);
}

export async function validateResult(results: unknown, state: { input: string; plan: string[] }): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  issues.push(...checkPlanExecuted(state.plan));
  issues.push(...checkNonEmptyResults(results));
  issues.push(...checkRequiredFields(results));
  issues.push(...checkPolicy(state.input));

  const score = scoreFromIssues(issues);
  const passed = issues.every(i => i.severity !== 'error');

  return {
    passed,
    score,
    issues,
  };
}
