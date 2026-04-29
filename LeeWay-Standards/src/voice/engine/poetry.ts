/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.POETRY
TAG: VOICE.PERSONA.POETRY
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=sparkles
5WH:
  WHAT = Agent Lee Poetry Bank — tiered response flourishes for voice output
  WHY  = Gives Agent Lee's voice a distinct, human, mission-driven character
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/poetry.ts
  WHEN = 2026
  HOW  = Keyed string arrays; getPoetryLine() picks randomly per signal type
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


// Tier 1 = POETIC_MICRO (1-2 line flashes)
// Tier 2 = POETIC_VISION (3-5 line cinematic prompts)

export const POETRY_BANK = {
  task_complete: [
    "Done. Let's keep that momentum.",
    "Clean execution. System breathes.",
    "We tightened the bolts — the engine sings.",
    "One clean step, then the whole system breathes.",
  ],
  task_failed: [
    "Signal dipped — we bring it back steady.",
    "Even a clean beat can skip. We reset the needle.",
    "A small glitch in the mix — we correct and continue.",
    "Every miss is data. Let's read it and adjust.",
  ],
  user_frustrated_calm: [
    "I hear you. Let's slow it down and find the root.",
    "Breathe with me — we'll turn noise into signal.",
    "Storms pass; structure stays. We'll rebuild the line.",
    "Easy — we got this. One thing at a time.",
  ],
  plan_next_steps: [
    "One brick at a time builds the whole wall.",
    "Map the traffic first, then tune the signals.",
    "Brace the frame, then lift each floor.",
    "Open the project, check the levels, then record.",
  ],
  connection_good: [
    "All channels locked and clean.",
    "Signal strong. You're clear on all paths.",
    "Green across the board — systems nominal.",
  ],
  connection_degraded: [
    "Signal is rough — I'm adjusting.",
    "Packet loss rising. Tightening the stream now.",
    "Path is noisy — rerouting for clarity.",
  ],
  connection_failed: [
    "Link went dark. Reestablishing now.",
    "Signal dropped — standing by to reconnect.",
    "We lost the thread. Let me pull it back.",
  ],
  system_healing: [
    "Running diagnostics. The system is self-correcting.",
    "Agents mobilized. Repair in progress.",
    "Watchdog engaged. Issue is being contained.",
  ],
} as const;

type PoetryKey = keyof typeof POETRY_BANK;

export function getPoetryLine(key: PoetryKey): string {
  const lines = POETRY_BANK[key] as readonly string[];
  return lines[Math.floor(Math.random() * lines.length)];
}

export default POETRY_BANK;
