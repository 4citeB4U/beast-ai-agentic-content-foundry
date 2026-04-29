/*
LEEWAY HEADER — DO NOT REMOVE

DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render

REGION: AI.ORCHESTRATION.CORE.MODEL_POLICY
TAG: AI.ORCHESTRATION.CORE.MODEL_POLICY.leeway

COLOR_ONION_HEX:
NEON=#4285F4
FLUO=#5A9AF5
PASTEL=#BFDBFE

ICON_ASCII:
family=lucide
glyph=route

5WH:
WHAT = leeway model lane policy for consistent free-tier-first routing
WHY = Keeps default model usage aligned across pages, services, agents, and creators workflows
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/model_lane_policy.ts
WHEN = 2026
HOW = Central constants and helpers for preferred/default/fallback leeway model IDs

AGENTS:
ASSESS
AUDIT
leeway

LICENSE:
MIT
*/


// Ollama-only model policy
export const LOCAL_INFERENCE_DEFAULT = 'llama3.2-vision';
export const OLLAMA_CODER = 'qwen2.5-coder:1.5b';
export const OLLAMA_VISION = 'qwen2.5vl:3b';

export const MODEL_LANES = [
  LOCAL_INFERENCE_DEFAULT,
  OLLAMA_CODER,
  OLLAMA_VISION,
];

