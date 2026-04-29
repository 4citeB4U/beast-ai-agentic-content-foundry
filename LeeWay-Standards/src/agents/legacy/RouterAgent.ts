/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.AGENT.VOICE
TAG: AI.ORCHESTRATION.AGENT.ROUTER.INTENT

COLOR_ONION_HEX:
NEON=#F59E0B
FLUO=#FBBF24
PASTEL=#FEF3C7

ICON_ASCII:
family=lucide
glyph=git-branch

5WH:
WHAT = RouterAgent — classifies each user turn and decides local LLM-style vs governed routing
WHY = Minimises unnecessary escalation by handling simple intents locally through deterministic rules
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = agents/RouterAgent.ts
WHEN = 2026-04-04

AGENTS:
ASSESS
AUDIT
leeway
ROUTER

LICENSE:
MIT
*/

// agents/RouterAgent.ts
// Client-side companion to the server-side router_agent.py.
// Provides a best-effort client classification for UI pre-rendering hints.
// The authoritative routing decision is always made server-side.

// LeewayInferenceClient import removed (no longer used)
import { eventBus } from '../../core/EventBus';
import { buildAgentLeeCorePrompt } from '../../core/agent_lee_prompt_assembler';

const CORE_SYSTEM = buildAgentLeeCorePrompt();
const ROUTER_SYSTEM = `${CORE_SYSTEM}

SPECIALIST ROLE — ROUTER AGENT:
Classify the user's message and decide whether it should be handled locally or by governed routing.
Respond ONLY with a JSON object:
{
  "intent": "<short label: e.g. greeting | factual_question | code_help | creative | complex_reasoning | safety_concern>",
  "mode": "local" | "leeway",
  "confidence": <0.0–1.0>,
  "reason": "<one sentence>"
}

Route to "local" for: greetings, simple yes/no, time/date, short factual recall, basic math.
Route to "leeway" for: multi-step reasoning, code generation, creative writing, ambiguous or complex queries.`;

// Simple synchronous fast-path rules (no API call needed)
const LOCAL_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|good\s+(morning|afternoon|evening))/i,
  /^(what time|what's the time|what is the time)/i,
  /^(yes|no|ok|okay|sure|thanks|thank you|bye|goodbye)/i,
  /^\d[\d\s+\-*/()]*=?\s*$/,  // pure arithmetic
];

export type RouteDecision = {
  intent: string;
  mode: 'local' | 'leeway';
  confidence: number;
  reason: string;
};

export class RouterAgent {
  /**
   * Classify a user message and emit router:intent.
   * Fast-path rules run synchronously; ambiguous turns are sent to leeway.
   */
  static async classify(userMessage: string): Promise<RouteDecision> {
    // Fast path
    for (const pattern of LOCAL_PATTERNS) {
      if (pattern.test(userMessage.trim())) {
        const decision: RouteDecision = {
          intent: 'simple',
          mode: 'local',
          confidence: 0.97,
          reason: 'Matched local fast-path pattern.',
        };
        eventBus.emit('router:intent', decision);
        return decision;
      }
    }
    // No leeway/cloud fallback. Always route to local if not matched.
    const fallback: RouteDecision = { intent: 'unknown', mode: 'local', confidence: 0.5, reason: 'No leeway/cloud fallback; defaulting to local.' };
    eventBus.emit('router:intent', fallback);
    return fallback;
  }
}

