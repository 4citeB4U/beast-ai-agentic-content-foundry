/*
LEEWAY HEADER — DO NOT REMOVE

REGION: CORE
TAG: CORE.SDK.AGENTCOGNITION.MAIN
DESCRIPTION: Deterministic sovereign cognition provider with no model inference.
AUTHORITY: LeeWay-Standards
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

5WH:
WHAT = AgentCognitionProvider module
WHY = To provide deterministic, policy-safe cognition across the SDK
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/AgentCognitionProvider.ts
WHEN = 2026-04-22
HOW = Rule-based sovereign response selection with no model calls

CHAIN: Standards → Integrated → Runtime → Projections
LICENSE: MIT
*/

import { originInterpret } from './origin/OriginCore';
import { buildPlan } from './structure/StructureCore';
import { executePlan } from './runtime/AgentRuntime';
import { validateResult } from './veritas/VeritasCore';
import { synthesizeOutput } from './synthesis/SynthesisCore';
import { vectorRetrieve } from './vector/VectorCore';
import { echoRead, echoWrite, writeReceipt } from './echo/EchoCore';

function extractUserSignal(prompt: string): string {
  const learnerRequestMatch = prompt.match(/LEARNER REQUEST:\s*([\s\S]*?)\n\nINSTRUCTION:/i);
  if (learnerRequestMatch?.[1]) {
    return learnerRequestMatch[1].trim();
  }

  const trimmed = prompt.trim();
  const compact = trimmed.replace(/\s+/g, ' ');
  return compact.length > 0 ? compact : 'help me';
}

async function runDeterministicCognitionCycle(rawPrompt: string): Promise<string> {
  const input = extractUserSignal(rawPrompt);
  const requestId = `cog-${Date.now()}`;

  const origin = originInterpret({ input });
  writeReceipt({
    action: 'ORIGIN_INTERPRET',
    from: 'LEE_PRIME',
    to: 'ORIGIN_CORE',
    status: 'SUCCESS',
  });

  const memoryHits = await echoRead(input, requestId, 'ORIGIN_CORE');
  writeReceipt({
    action: 'MEMORY_READ',
    from: 'ORIGIN_CORE',
    to: 'ECHO_CORE',
    status: 'SUCCESS',
  });

  const grounding = await vectorRetrieve(input);
  writeReceipt({
    action: 'VECTOR_RETRIEVE',
    from: 'ORIGIN_CORE',
    to: 'VECTOR_CORE',
    status: 'SUCCESS',
  });

  const plan = buildPlan(origin, input);
  writeReceipt({
    action: 'PLAN_BUILD',
    from: 'ORIGIN_CORE',
    to: 'STRUCTURE_CORE',
    status: 'SUCCESS',
  });

  const results = await executePlan(plan, origin, input, grounding, memoryHits);
  writeReceipt({
    action: 'EXECUTE_PLAN',
    from: 'STRUCTURE_CORE',
    to: 'RUNTIME_AGENT',
    status: 'SUCCESS',
  });

  const validation = await validateResult(results, {
    input,
    plan: plan.steps,
  });
  writeReceipt({
    action: 'VALIDATE',
    from: 'RUNTIME_AGENT',
    to: 'VERITAS_CORE',
    status: validation.passed ? 'SUCCESS' : 'FAILURE',
  });

  const output = await synthesizeOutput({
    input,
    intent: origin.primaryIntent,
    context: {
      health: {
        runtime: 'ready',
        voice: 'rtc-backed',
        vision: 'metadata-routed',
        memory: 'echo-authority',
      },
      confidence: origin.confidence,
      ambiguity: origin.ambiguous,
      grounding,
    },
    results,
    validation,
    meta: {
      severity: validation.passed ? 'info' : 'warn',
    },
  });

  await echoWrite(
    {
      input,
      output,
      validation,
    },
    requestId,
  );
  writeReceipt({
    action: 'MEMORY_WRITE',
    from: 'LEE_PRIME',
    to: 'ECHO_CORE',
    status: 'SUCCESS',
  });

  return output;
}

/**
 * AgentCognition
 * Deterministic cognition provider for sovereign runtime operation.
 * No model inference, no cloud dependencies.
 */
export const AgentCognition = {
  /**
   * Generate a deterministic completion under governance-safe rules.
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      return await runDeterministicCognitionCycle(prompt);
    } catch (error) {
      console.error('[AgentCognition] Generation failed:', error);
      return `[Agent Lee is in Sovereign Mode. Direct signal established. Intelligence layer is recalibrating.]`;
    }
  }
};

// Attach to window for global access if needed
if (typeof window !== 'undefined') {
  (window as any).AgentCognition = AgentCognition;
}
