/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.VECTOR.RETRIEVAL.CORE
DESCRIPTION: Deterministic curriculum retrieval layer for grounded tutoring context.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice -> Intent -> Location -> Vertical -> Ranking -> Render

LICENSE: MIT
*/

interface RetrievalDoc {
  id: string;
  topic: string;
  text: string;
  keywords: string[];
}

const CURRICULUM_INDEX: RetrievalDoc[] = [
  {
    id: 'doc-agentic-cycle',
    topic: 'Agentic Runtime Cycle',
    text: 'Agent Lee cycle: Perception, Origin, Structure, Execution, Veritas, Echo, Vector, Synthesis, then Lee Prime delivery.',
    keywords: ['agent', 'cycle', 'origin', 'structure', 'veritas', 'echo', 'vector', 'synthesis'],
  },
  {
    id: 'doc-cert-path',
    topic: 'Certification Guidance',
    text: 'Certification guidance is standards-first: pick role target, map prerequisites, schedule labs, verify completion with receipts.',
    keywords: ['cert', 'certification', 'aws', 'azure', 'roadmap', 'plan'],
  },
  {
    id: 'doc-debug-loop',
    topic: 'Debug Workflow',
    text: 'Debug with smallest reproducer, constrained fix, rerun verification, then document with receipts before broad rollout.',
    keywords: ['debug', 'error', 'fix', 'issue', 'reproduce', 'verify'],
  },
  {
    id: 'doc-rtc-boundary',
    topic: 'RTC and Cognitive Boundary',
    text: 'LeeWay-Edge-RTC senses and transports voice and visual metadata while Agent Lee cores decide interpretation, planning, validation, memory, and synthesis.',
    keywords: ['rtc', 'voice', 'vision', 'metadata', 'transport', 'agent lee'],
  },
];

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreDoc(tokens: string[], doc: RetrievalDoc): number {
  const tokenSet = new Set(tokens);
  let score = 0;
  for (const keyword of doc.keywords) {
    if (tokenSet.has(keyword.toLowerCase())) score += 1;
  }
  if (tokens.some(t => doc.text.toLowerCase().includes(t))) score += 0.5;
  return score;
}

export async function vectorRetrieve(query: string): Promise<Array<{ topic: string; text: string; score: number }>> {
  const tokens = tokenize(query);

  return CURRICULUM_INDEX.map(doc => ({
    topic: doc.topic,
    text: doc.text,
    score: scoreDoc(tokens, doc),
  }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
