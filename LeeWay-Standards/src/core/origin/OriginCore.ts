/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.ORIGIN.INTERPRETATION.MAIN
DESCRIPTION: Deterministic intent interpretation core with ambiguity handling.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

export type OriginIntent =
  | 'GENERAL_HELP'
  | 'DEBUG_HELP'
  | 'CERT_ADVICE'
  | 'LEARNING_PLAN'
  | 'SYSTEM_STATUS'
  | 'VOICE_CONTROL'
  | 'VISION_QUERY'
  | 'MEMORY_RECALL'
  | 'UNKNOWN';

export interface IntentCandidate {
  intent: OriginIntent;
  score: number;
  reasons: string[];
}

export interface OriginDecision {
  primaryIntent: OriginIntent;
  candidates: IntentCandidate[];
  ambiguous: boolean;
  needsClarification: boolean;
  confidence: number;
  extractedEntities: Record<string, string[]>;
  recommendedNextCore: 'STRUCTURE_CORE' | 'VECTOR_CORE' | 'ECHO_CORE' | 'LEE_PRIME';
}

const INTENT_PATTERNS: Array<{
  intent: OriginIntent;
  patterns: RegExp[];
  weight: number;
}> = [
  {
    intent: 'DEBUG_HELP',
    patterns: [/\bdebug\b/i, /\berror\b/i, /\bfix\b/i, /\bbroken\b/i, /\bissue\b/i],
    weight: 1,
  },
  {
    intent: 'CERT_ADVICE',
    patterns: [/\bcert\b/i, /\bcertification\b/i, /\baws\b/i, /\bazure\b/i, /\bcloud\b/i],
    weight: 1,
  },
  {
    intent: 'LEARNING_PLAN',
    patterns: [/\bplan\b/i, /\broadmap\b/i, /\blearn\b/i, /\bstudy\b/i, /\bstart with\b/i],
    weight: 0.9,
  },
  {
    intent: 'SYSTEM_STATUS',
    patterns: [/\bstatus\b/i, /\bhealth\b/i, /\bdiagnostic\b/i, /\bruntime\b/i],
    weight: 0.9,
  },
  {
    intent: 'VOICE_CONTROL',
    patterns: [/\bspeak\b/i, /\bvoice\b/i, /\bmicrophone\b/i, /\blisten\b/i],
    weight: 0.8,
  },
  {
    intent: 'VISION_QUERY',
    patterns: [/\bsee\b/i, /\bcamera\b/i, /\bobject\b/i, /\blook at\b/i, /\bsurroundings\b/i, /\bin frame\b/i],
    weight: 0.8,
  },
  {
    intent: 'MEMORY_RECALL',
    patterns: [/\bremember\b/i, /\brecall\b/i, /\blast time\b/i, /\bbefore\b/i],
    weight: 0.8,
  },
  {
    intent: 'GENERAL_HELP',
    patterns: [/\bhelp\b/i, /\bhow do i\b/i, /\bwhat should i\b/i],
    weight: 0.5,
  },
];

function normalizeInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, ' ')
    .toLowerCase();
}

function extractEntities(input: string): Record<string, string[]> {
  const entities: Record<string, string[]> = {
    technologies: [],
    actions: [],
    domains: [],
  };

  const techTerms = ['python', 'aws', 'azure', 'react', 'rtc', 'vision', 'chroma', 'agent'];
  const actionTerms = ['fix', 'build', 'learn', 'debug', 'plan', 'remember', 'speak'];
  const domainTerms = ['certification', 'lesson', 'runtime', 'camera', 'memory'];

  for (const term of techTerms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(input)) entities.technologies.push(term);
  }
  for (const term of actionTerms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(input)) entities.actions.push(term);
  }
  for (const term of domainTerms) {
    if (new RegExp(`\\b${term}\\b`, 'i').test(input)) entities.domains.push(term);
  }

  return entities;
}

function scoreIntent(input: string, intent: OriginIntent): IntentCandidate {
  const rule = INTENT_PATTERNS.find(r => r.intent === intent);
  if (!rule) {
    return { intent, score: 0, reasons: ['No scoring rule found'] };
  }

  let score = 0;
  const reasons: string[] = [];

  for (const pattern of rule.patterns) {
    if (pattern.test(input)) {
      score += rule.weight;
      reasons.push(`matched:${pattern.source}`);
    }
  }

  if (input.length < 8) {
    score -= 0.2;
    reasons.push('short input lowers certainty');
  }

  return {
    intent,
    score: Number(score.toFixed(2)),
    reasons,
  };
}

function chooseRecommendedCore(primaryIntent: OriginIntent): OriginDecision['recommendedNextCore'] {
  switch (primaryIntent) {
    case 'MEMORY_RECALL':
      return 'ECHO_CORE';
    case 'VISION_QUERY':
      return 'VECTOR_CORE';
    default:
      return 'STRUCTURE_CORE';
  }
}

export function originInterpret(state: {
  input: string;
  context?: Record<string, unknown>;
}): OriginDecision {
  const normalized = normalizeInput(state.input);
  const entities = extractEntities(normalized);

  const candidates = INTENT_PATTERNS.map(rule => scoreIntent(normalized, rule.intent)).sort(
    (a, b) => b.score - a.score,
  );

  const top = candidates[0] ?? { intent: 'UNKNOWN' as OriginIntent, score: 0, reasons: ['no match'] };
  const second = candidates[1] ?? { intent: 'UNKNOWN' as OriginIntent, score: 0, reasons: [] };

  const ambiguous = top.score > 0 && second.score > 0 && Math.abs(top.score - second.score) <= 0.4;

  const needsClarification =
    top.score <= 0.5 ||
    ambiguous ||
    (entities.actions.length === 0 && entities.domains.length === 0 && normalized.split(' ').length < 4);

  const confidence = Math.max(0, Math.min(1, top.score / 3));

  return {
    primaryIntent: top.intent,
    candidates,
    ambiguous,
    needsClarification,
    confidence: Number(confidence.toFixed(2)),
    extractedEntities: entities,
    recommendedNextCore: chooseRecommendedCore(top.intent),
  };
}
