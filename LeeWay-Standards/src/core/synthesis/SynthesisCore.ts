/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.SYNTHESIS.RENDER.CORE
DESCRIPTION: Deterministic response renderer for validated cognition outputs.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

export type SynthesisFrame =
  | 'DIRECT_ANSWER'
  | 'GUIDED_STEPS'
  | 'STATUS_REPORT'
  | 'CLARIFICATION_PROMPT'
  | 'MEMORY_RESPONSE'
  | 'DEBUG_REPORT';

export interface SynthesisState {
  input: string;
  intent?: string;
  context?: Record<string, unknown>;
  results: Record<string, any>;
  validation: {
    passed: boolean;
    score: number;
    issues: Array<{ code: string; message: string; severity: 'info' | 'warn' | 'error' }>;
  };
  meta?: {
    severity?: 'info' | 'warn' | 'error';
  };
}

function chooseFrame(state: SynthesisState): SynthesisFrame {
  if (!state.validation.passed) return 'DEBUG_REPORT';
  if (state.results?.clarificationQuestion) return 'CLARIFICATION_PROMPT';
  if (state.intent === 'MEMORY_RECALL') return 'MEMORY_RESPONSE';
  if (state.intent === 'DEBUG_HELP') return 'DEBUG_REPORT';
  if (state.intent === 'SYSTEM_STATUS') return 'STATUS_REPORT';
  if (Array.isArray(state.results?.steps) && state.results.steps.length > 0) return 'GUIDED_STEPS';
  return 'DIRECT_ANSWER';
}

function renderDirectAnswer(state: SynthesisState): string {
  return [state.results?.summary || 'Objective understood.', state.results?.answer || '', state.results?.nextStep ? `Next: ${state.results.nextStep}` : '']
    .filter(Boolean)
    .join('\n');
}

function renderGuidedSteps(state: SynthesisState): string {
  const steps: string[] = Array.isArray(state.results?.steps) ? state.results.steps : [];
  const intro = state.results?.summary || 'Here is the clean path forward:';
  const lines = steps.map((step, i) => `${i + 1}. ${step}`);
  const close = state.results?.nextStep ? `After that: ${state.results.nextStep}` : '';
  return [intro, ...lines, close].filter(Boolean).join('\n');
}

function renderStatusReport(state: SynthesisState): string {
  const health = (state.context?.health as Record<string, string> | undefined) ?? {};
  return [
    'System status:',
    `- Validation score: ${state.validation.score}`,
    `- Runtime: ${health.runtime ?? 'ready'}`,
    `- Voice: ${health.voice ?? 'available'}`,
    `- Vision: ${health.vision ?? 'metadata-only'}`,
    `- Memory: ${health.memory ?? 'local'}`,
  ].join('\n');
}

function renderClarificationPrompt(state: SynthesisState): string {
  return [
    state.results?.summary || 'I see more than one possible meaning here.',
    state.results?.clarificationQuestion || 'Which direction should I take?',
  ].join('\n');
}

function renderMemoryResponse(state: SynthesisState): string {
  return [state.results?.summary || 'Here is what I found from memory:', state.results?.memoryResponse || state.results?.answer || '']
    .filter(Boolean)
    .join('\n');
}

function renderDebugReport(state: SynthesisState): string {
  const issues = state.validation.issues?.length
    ? state.validation.issues.map(issue => `- ${issue.message}`).join('\n')
    : '- Validation failed without issue details.';

  return [
    state.validation.passed ? state.results?.summary || 'Debug plan ready.' : 'Result requires correction before delivery.',
    state.results?.answer || '',
    'Validation notes:',
    issues,
    state.results?.nextStep ? `Repair: ${state.results.nextStep}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function applyAgentLeeVoice(text: string): string {
  const opener = 'Agent Lee locked in. Standards up, signal clear.';
  if (text.startsWith(opener)) return text;
  return `${opener}\n${text}`;
}

export async function synthesizeOutput(state: SynthesisState): Promise<string> {
  const frame = chooseFrame(state);

  let text = '';
  switch (frame) {
    case 'DIRECT_ANSWER':
      text = renderDirectAnswer(state);
      break;
    case 'GUIDED_STEPS':
      text = renderGuidedSteps(state);
      break;
    case 'STATUS_REPORT':
      text = renderStatusReport(state);
      break;
    case 'CLARIFICATION_PROMPT':
      text = renderClarificationPrompt(state);
      break;
    case 'MEMORY_RESPONSE':
      text = renderMemoryResponse(state);
      break;
    case 'DEBUG_REPORT':
      text = renderDebugReport(state);
      break;
  }

  return applyAgentLeeVoice(text.trim());
}
