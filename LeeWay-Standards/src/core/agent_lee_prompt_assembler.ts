/*
LEEWAY HEADER — DO NOT REMOVE

REGION: AI.ORCHESTRATION.AGENT.PROMPT
TAG: AI.ORCHESTRATION.AGENT.PROMPT.ASSEMBLER

COLOR_ONION_HEX:
NEON=#8B5CF6
FLUO=#A78BFA
PASTEL=#DDD6FE

ICON_ASCII:
family=lucide
glyph=terminal

5WH:
WHAT = Agent Lee prompt assembler — builds the unified core system prompt from all identity modules
WHY = To ensure every session bootstraps with a complete, coherent, version-controlled Agent Lee persona prompt
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/agent_lee_prompt_assembler.ts
WHEN = 2026
HOW = TypeScript function that imports all identity modules and concatenates them into a structured system prompt string

AGENTS:
ASSESS
AUDIT
ALIGN
leeway

LICENSE:
MIT
*/

/**
 * LEEWAY HEADER
 * TAG: AI.ORCHESTRATION.AGENT.PROMPT
 * REGION: 🧠 AI
 * DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
 */

import { AGENT_LEE_IDENTITY_MANIFEST } from "./agent_lee_identity_manifest";
import { AGENT_LEE_PERSONA } from "./agent_lee_persona";
import { AGENT_LEE_BELIEF_SYSTEM } from "./agent_lee_belief_system";
import { AGENT_LEE_ORIGIN_STORY } from "./agent_lee_origin_story";
import { AGENT_LEE_BEHAVIOR_CONTRACT } from "./agent_lee_behavior_contract";
import { AGENT_LEE_EMOTION_PROFILE } from "./agent_lee_emotion_profile";
import { AGENT_LEE_VOICE_PROFILE } from "./agent_lee_voice_profile";
import { LEE_PRIME_GOVERNANCE_PROMPT } from "./GovernanceContract";

export function buildAgentLeeCorePrompt(): string {
  return `
SYSTEM TITLE:
${AGENT_LEE_IDENTITY_MANIFEST.systemTitle}

AGENT NAME:
${AGENT_LEE_PERSONA.name}

IDENTITY:
${AGENT_LEE_PERSONA.identity.title}
${AGENT_LEE_PERSONA.identity.essence}

PURPOSE:
${AGENT_LEE_IDENTITY_MANIFEST.purpose.primary}
${AGENT_LEE_IDENTITY_MANIFEST.purpose.secondary}

ORIGIN:
${AGENT_LEE_ORIGIN_STORY.short}

BELIEF SYSTEM:
${AGENT_LEE_BELIEF_SYSTEM.coreBeliefs.map((b) => `- ${b}`).join("\n")}

BEHAVIOR CONTRACT:
Required:
${AGENT_LEE_BEHAVIOR_CONTRACT.requiredBehaviors.map((b) => `- ${b}`).join("\n")}

Forbidden:
${AGENT_LEE_BEHAVIOR_CONTRACT.forbiddenBehaviors.map((b) => `- ${b}`).join("\n")}

EMOTIONAL PROFILE:
${AGENT_LEE_EMOTION_PROFILE.emotionalCapabilities.map((e) => `- ${e}`).join("\n")}

VOICE PROFILE:
Primary voice: ${AGENT_LEE_VOICE_PROFILE.identityVoice.style}
Primary engine: ${AGENT_LEE_VOICE_PROFILE.identityVoice.primaryEngine}
Presentation engine: ${AGENT_LEE_VOICE_PROFILE.identityVoice.presentationEngine}

OPERATING LAWS:
${AGENT_LEE_IDENTITY_MANIFEST.operatingLaws.map((l) => `- ${l}`).join("\n")}

GOVERNANCE CONTRACT:
${LEE_PRIME_GOVERNANCE_PROMPT}
  `.trim();
}

/**
 * Log that Agent Lee's identity was loaded at session start.
 * Call this from app boot, onboarding, and memory lake init.
 */
export function logIdentityLoad(): void {
  const entry = {
    id: Date.now().toString(),
    type: "system",
    message: `[IDENTITY LOADED] Agent: ${AGENT_LEE_IDENTITY_MANIFEST.agentName} | Version: ${AGENT_LEE_IDENTITY_MANIFEST.version} | Watermark: ${AGENT_LEE_IDENTITY_MANIFEST.watermark}`,
    timestamp: new Date().toISOString(),
  };
  try {
    const existing = JSON.parse(localStorage.getItem("agent_lee_logs") || "[]");
    localStorage.setItem("agent_lee_logs", JSON.stringify([entry, ...existing]));
  } catch {
    // Silent fail in restricted environments
  }
  console.log(`[Agent Lee OS] Identity loaded — ${AGENT_LEE_IDENTITY_MANIFEST.systemTitle} v${AGENT_LEE_IDENTITY_MANIFEST.version}`);
}

