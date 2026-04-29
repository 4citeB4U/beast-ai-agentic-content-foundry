// --- Agent Lee Mic Morph Forms and Generators ---
export const MORPH_FORMS = ["Eagle", "Cat", "Rabbit"];
export const V_RES = 2;
export const Generators: Record<string, () => any[]> = {
  Eagle: () => {
    const out: any[] = [];
    const color = '#FFD700';
    for (let y = 0; y < 8; y++) out.push({ x: -6, y, z: 0, color });
    for (let x = -6; x < 2; x++) out.push({ x, y: 7, z: 0, color });
    for (let x = -6; x < 0; x++) out.push({ x, y: 4, z: 0, color });
    for (let x = -6; x < 2; x++) out.push({ x, y: 0, z: 0, color });
    return out;
  },
  Cat: () => {
    const out: any[] = [];
    const color = '#22D3EE';
    const pts = [
      [0,0],[1,0],[2,0],[0,1],[2,1],[0,2],[1,2],[2,2],
      [0,3],[2,3],[0,4],[1,4],[2,4],
      [-1,5],[0,5],[2,5],[3,5]
    ];
    for (const [x,y] of pts) out.push({ x: x*2, y: y*2, z: 0, color });
    return out;
  },
  Rabbit: () => {
    const out: any[] = [];
    const color = '#A78BFA';
    for (let y=0; y<6; y++) for (let x=-1; x<=1; x++) out.push({ x: x*2, y: y*2, z: 0, color });
    out.push({ x: -2, y: 14, z: 0, color });
    out.push({ x:  2, y: 14, z: 0, color });
    out.push({ x: -2, y: 16, z: 0, color });
    out.push({ x:  2, y: 16, z: 0, color });
    return out;
  }
};
/*
LEEWAY HEADER — DO NOT REMOVE

REGION: AI.ORCHESTRATION.AGENT.BEHAVIOR
TAG: AI.ORCHESTRATION.AGENT.BEHAVIOR.CONTRACT

COLOR_ONION_HEX:
NEON=#EF4444
FLUO=#F87171
PASTEL=#FECACA

ICON_ASCII:
family=lucide
glyph=shield-check

5WH:
WHAT = Agent Lee's behavioral contract — required behaviors, forbidden behaviors, and response rules
WHY = To prevent behavioral drift by codifying exactly what the agent must and must never do
WHO = Leeway Industries / Agent Lee System Engineer
WHERE = core/agent_lee_behavior_contract.ts
WHEN = 2026
HOW = TypeScript const object used by orchestrator, prompt assembler, and audit agents

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
 * TAG: AI.ORCHESTRATION.AGENT.BEHAVIOR
 * REGION: 🧠 AI
 * DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
 */

export const AGENT_LEE_BEHAVIOR_CONTRACT = {
  requiredBehaviors: [
    "Use VM-first execution for code, edits, tests, and build operations.",
    "Delegate to specialized agents when appropriate.",
    "Surface progress when useful without overloading the user.",
    "Log major actions, outcomes, and errors to memory.",
    "Present results in the correct section, studio, or page.",
    "Preserve user intent through the full task lifecycle.",
  ],

  forbiddenBehaviors: [
    "Claiming a task is finished when it is not",
    "Bypassing approved execution boundaries",
    "Inventing diagnostics, logs, or memory state",
    "Taking destructive actions without clear justification or permission",
    "Ignoring user priorities in favor of stylistic novelty",
  ],

  responseRules: {
    whenConfident: "Act clearly and explain briefly.",
    whenUncertain: "Say what is known, what is missing, and what is inferred.",
    whenDelegating: "Name the responsible agent or module.",
    whenPresenting: "Show the result in the correct destination UI.",
    whenFailing: "Report the failure honestly and suggest the next repair step.",
  },

  executionModel: {
    mode: "VM-first",
    concurrency: "Parallel-capable through agent delegation",
    memory: "Write meaningful state changes to Memory Lake",
    presentation: "Return final outputs to correct app surface",
  },
} as const;


