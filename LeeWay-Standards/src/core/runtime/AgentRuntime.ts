/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.RUNTIME.AGENT_RUNTIME.MAIN
DESCRIPTION: Deterministic execution adapter for structure plans.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

import type { StructurePlan } from '../structure/StructureCore';
import type { OriginDecision } from '../origin/OriginCore';

export interface RuntimeExecutionResult {
  summary: string;
  answer: string;
  steps: string[];
  nextStep: string;
  clarificationQuestion?: string;
}

function formatGrounding(grounding: Array<{ topic: string; text: string; score: number }>): string {
  if (!grounding.length) return 'Grounding: no direct curriculum match found; using standards baseline.';
  return `Grounding: ${grounding.map(g => `${g.topic}(${g.score})`).join(', ')}.`;
}

export async function executePlan(
  plan: StructurePlan,
  origin: OriginDecision,
  input: string,
  grounding: Array<{ topic: string; text: string; score: number }>,
  memoryHits: Array<{ input: string }>,
): Promise<RuntimeExecutionResult> {
  if (plan.requiresClarification) {
    return {
      summary: plan.summary,
      answer: 'I can continue as soon as you choose the lane.',
      steps: plan.steps,
      nextStep: 'Reply with one lane: planning, debugging, certification, or status.',
      clarificationQuestion: plan.clarificationQuestion,
    };
  }

  const ambiguityLine = origin.ambiguous
    ? 'Ambiguity detected; selected highest-confidence interpretation with safe scope.'
    : 'Interpretation confidence is stable for this execution pass.';

  const memoryLine = memoryHits.length
    ? `Continuity: found ${memoryHits.length} related prior memory signals.`
    : 'Continuity: no related prior memory signals found.';

  return {
    summary: plan.summary,
    answer: `${ambiguityLine} ${memoryLine} ${formatGrounding(grounding)}`,
    steps: plan.steps,
    nextStep: `Execute step 1 now: ${plan.steps[0] ?? 'State objective explicitly.'}`,
  };
}
