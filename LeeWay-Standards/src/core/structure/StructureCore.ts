/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.STRUCTURE.PLANNING.CORE
DESCRIPTION: Deterministic plan construction core from interpreted intent.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

import type { OriginDecision } from '../origin/OriginCore';

export interface StructurePlan {
  summary: string;
  steps: string[];
  requiresClarification: boolean;
  clarificationQuestion?: string;
}

export function buildPlan(origin: OriginDecision, input: string): StructurePlan {
  if (origin.needsClarification) {
    return {
      summary: 'Input has multiple possible meanings.',
      steps: ['Pause execution path.', 'Request one clarification from learner.', 'Resume after clarification.'],
      requiresClarification: true,
      clarificationQuestion: 'Do you want help with planning, debugging, certification, or system status?',
    };
  }

  switch (origin.primaryIntent) {
    case 'DEBUG_HELP':
      return {
        summary: 'Build a strict debug workflow.',
        steps: [
          'Capture exact failing signal and environment.',
          'Create the smallest reproducible case.',
          'Apply one constrained fix and rerun verification.',
          'Record outcome and next hardening step.',
        ],
        requiresClarification: false,
      };
    case 'CERT_ADVICE':
      return {
        summary: 'Build a certification roadmap aligned to role intent.',
        steps: [
          'Select primary target role and timeline.',
          'Map prerequisite skills and lab milestones.',
          'Pick first certification checkpoint and exam window.',
          'Track completion artifacts in receipts.',
        ],
        requiresClarification: false,
      };
    case 'LEARNING_PLAN':
      return {
        summary: 'Construct a progression plan from current learner state.',
        steps: [
          'Identify current level and learning gap.',
          'Sequence modules from foundational to applied.',
          'Schedule guided practice and validation checks.',
          'Close each milestone with measurable outcomes.',
        ],
        requiresClarification: false,
      };
    case 'VISION_QUERY':
      return {
        summary: 'Answer within deterministic vision boundaries.',
        steps: [
          'Check available vision metadata signals.',
          'Return only observable facts and explicit limits.',
          'Request manual confirmation for uncertain scene claims.',
        ],
        requiresClarification: false,
      };
    case 'SYSTEM_STATUS':
      return {
        summary: 'Provide governed runtime status report.',
        steps: [
          'Report runtime phase and active subsystems.',
          'Report known limitations and pending integrations.',
          'Provide next action to improve readiness.',
        ],
        requiresClarification: false,
      };
    default:
      return {
        summary: 'Provide guided deterministic support.',
        steps: [
          'Interpret request and preserve learner context.',
          'Return practical, ordered actions with rationale.',
          'Offer immediate next step.',
        ],
        requiresClarification: false,
      };
  }
}
