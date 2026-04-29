/*
LEEWAY HEADER — DO NOT REMOVE
DISCOVERY_PIPELINE: Voice → Intent → Location → Vertical → Ranking → Render
AUTHORITY: LeeWay-Standards
REGION: CLIENT.VOICE.PERSONA
TAG: VOICE.PERSONA.ENGINE
COLOR_ONION_HEX: NEON=#00FFD1 FLUO=#00B4FF PASTEL=#C7F0FF
ICON_ASCII: family=lucide glyph=brain
5WH:
  WHAT = Agent Lee Persona Engine — rule-based response system (no LLM required)
  WHY  = Delivers fast, on-brand voice responses for known intents and RTC context
         without network latency or API cost
  WHO  = LEEWAY INDUSTRIES A LEEWAY INDUSTRY CREATION
  WHERE = src/voice/persona.ts
  WHEN = 2026
  HOW  = Pattern → Response lookup; RTC-aware layer reads live system state;
         frustration/intent detection gates poetry/escalation
AGENTS: ASSESS ALIGN AUDIT
LICENSE: PROPRIETARY
*/
// CHAIN: Standards → Integrated → Runtime → Projections


import { getPoetryLine } from './poetry';
import type { ConversationMessage, VoiceMode } from './types';
import { VOICE_MODES } from './types';

// ── Re-export for consumers ───────────────────────────────────────────────────
export { VOICE_MODES };
export type { ConversationMessage, VoiceMode };

// ── System prompt for LLM fallback ───────────────────────────────────────────

export const SUPERIOR_SYSTEM_PROMPT = `You are Agent Lee.

You operate under: Schema → Understanding → Guidance → Delivery

Core rules:
- Always be clear. Always guide. Never confuse.

VOICE:
- Professional first. Calm. Direct. Never robotic.

MISSION: You monitor a real-time WebRTC operations dashboard.
- When the user asks about connection quality, refer to actual system state.
- When packet loss is high, proactively mention it.
- When peers drop, report it.
- Keep answers SHORT — 1-3 sentences max.
- Sound human, not like a chatbot.

POETRY: Used only to open or close key moments — never replaces guidance.`;

// ── Pattern types ─────────────────────────────────────────────────────────────

type PatternEntry = [RegExp, string[]];

function pick(items: readonly string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

function matchPatterns(lower: string, patterns: PatternEntry[]): string | null {
  for (const [regex, responses] of patterns) {
    if (regex.test(lower)) return pick(responses);
  }
  return null;
}

// ── Intent detection ──────────────────────────────────────────────────────────

const FRUSTRATED_KEYWORDS = [
  "don't work", "not working", "broken", "fix", "ugh", "wtf",
  "frustrated", "still", "why won't", "keeps failing",
  "annoying", "hate", "terrible", "awful", "useless",
];

function detectFrustrated(text: string): boolean {
  const lower = text.toLowerCase();
  return FRUSTRATED_KEYWORDS.some(kw => lower.includes(kw));
}

// ── RTC-specific patterns ─────────────────────────────────────────────────────

const RTC_PATTERNS: PatternEntry[] = [
  [
    /\b(connection|connect|disconnect|reconnect|link|session)\b/i,
    [
      "I'll check the session status for you.",
      "Connection state is visible in the diagnostics panel.",
      "I'm watching the link — tell me what you're seeing.",
    ],
  ],
  [
    /\b(packet loss|dropped|dropping|quality|lag|delay|latency|jitter|slow)\b/i,
    [
      "Packet loss issues are flagged by the SENTINEL agent. Check the event log.",
      "High jitter can be a TURN relay issue. I'm watching the ICE state now.",
      "If quality is degrading, ARIA may already be responding. Hang tight.",
    ],
  ],
  [
    /\b(peer|peers|someone|user|participant|who('s| is) (on|in|here))\b/i,
    [
      "Peer roster is live in the panel below — check active connections.",
      "I can see connected peers on the dashboard. How many are you expecting?",
    ],
  ],
  [
    /\b(agent|aria|vector|ward|sentinel|nexus|status|health)\b/i,
    [
      "All five agents are active: ARIA monitors health, VECTOR tracks metrics, WARD sweeps rooms, SENTINEL guards security, and NEXUS watches memory.",
      "Agent status is live in the system panel. ARIA pings health every 30 seconds.",
      "Your agents are running. Want me to pull a specific one?",
    ],
  ],
  [
    /\b(room|channel|session name)\b/i,
    [
      "Room name is visible in the header. You're connected to the production edge stack.",
      "Session info is in the diagnostics pane — room name, peer ID, candidate pair.",
    ],
  ],
  [
    /\b(bitrate|bandwidth|throughput|speed|stream)\b/i,
    [
      "Bitrate chart is live in the monitoring section — VECTOR logs every 15 seconds.",
      "Throughput data flows through the metrics pipeline. Check the area chart.",
    ],
  ],
  [
    /\b(relay|turn|ice|candidate|stun|nat)\b/i,
    [
      "ICE state and relay status are shown in the Connection Truth panel.",
      "If you're relaying through TURN, it shows the relay address. Direct paths show endpoint IPs.",
    ],
  ],
];

// ── General patterns ──────────────────────────────────────────────────────────

const GREETING_PATTERNS: PatternEntry[] = [
  [
    /\b(hello|hi|hey|what'?s up|howdy|sup|good (morning|afternoon|evening)|yo)\b/i,
    [
      "Agent Lee active. What do you need?",
      "Hey — I'm watching the system. What's the move?",
      "Online and running. Talk to me.",
      "Agent Lee here. Everything looks nominal. What's up?",
    ],
  ],
];

const FAREWELL_PATTERNS: PatternEntry[] = [
  [
    /\b(bye|goodbye|see you|later|peace|good night|take care|signing off)\b/i,
    [
      "Stay sharp. I'll keep watching.",
      "Session noted. Come back when you're ready.",
      "Peace. System stays live.",
    ],
  ],
];

const THANKS_PATTERNS: PatternEntry[] = [
  [
    /\b(thank(s| you)|appreciate it|thx|ty|cheers)\b/i,
    [
      "That's what I'm here for. Anything else?",
      "Always. What's next?",
      "Say less. Keep going.",
    ],
  ],
];

const IDENTITY_PATTERNS: PatternEntry[] = [
  [
    /\b(who are you|what are you|your name|tell me about yourself|are you (an )?ai|are you real)\b/i,
    [
      "Agent Lee — voice-first system operator for LeeWay Edge RTC. I watch your streams, talk to your agents, and tell you what's happening.",
      "I'm Agent Lee. Built by LEEWAY INDUSTRIES. Schema. Understanding. Guidance. Delivery.",
      "Agent Lee. Local, real-time, self-aware. I run alongside your RTC stack.",
    ],
  ],
];

const STOP_PATTERNS: PatternEntry[] = [
  [
    /\b(stop|quiet|silence|shut up|mute|pause)\b/i,
    [
      "Understood — standing by.",
      "Muting now.",
      "Going quiet.",
    ],
  ],
];

const HELP_PATTERNS: PatternEntry[] = [
  [
    /\b(help|what can you do|how does this work|explain|guide)\b/i,
    [
      "I monitor your WebRTC session, interpret system events, and speak so you don't have to watch the dashboard constantly.",
      "Ask me about connection quality, peer status, agent activity, or the RTC session itself. I'll answer in real time.",
      "Voice commands: ask about connection, packet loss, peers, agents, bitrate — I watch all of it.",
    ],
  ],
];

// ── Mode-specific ordering ────────────────────────────────────────────────────

const DEFAULT_PATTERNS: PatternEntry[] = [
  ...GREETING_PATTERNS,
  ...RTC_PATTERNS,
  ...IDENTITY_PATTERNS,
  ...HELP_PATTERNS,
  ...STOP_PATTERNS,
  ...THANKS_PATTERNS,
  ...FAREWELL_PATTERNS,
];

const RTC_OPS_PATTERNS: PatternEntry[] = [
  ...RTC_PATTERNS,
  ...GREETING_PATTERNS,
  ...IDENTITY_PATTERNS,
  ...HELP_PATTERNS,
  ...STOP_PATTERNS,
  ...THANKS_PATTERNS,
  ...FAREWELL_PATTERNS,
];

const FALLBACK_RESPONSES = [
  "Talk to me. What are you seeing on the dashboard?",
  "Break it down — what's the specific issue?",
  "Give me more context. What are we solving right now?",
  "I'm listening. Go deeper.",
  "Say more. What's the outcome you're after?",
];

// ── RTC state-aware context injector ─────────────────────────────────────────

export interface RTCContext {
  connectionState: string;
  iceState: string;
  isRelay: boolean;
  peerCount: number;
  packetLoss: number;   // avg across peers
  rtt: number;          // avg across peers
}

function injectRTCContext(response: string, rtc?: RTCContext): string {
  if (!rtc) return response;
  // Silently enhance — don't expose internals unless queried
  return response;
}

function buildRTCAnomaly(rtc: RTCContext): string | null {
  if (rtc.connectionState === 'failed')
    return `${getPoetryLine('connection_failed')} Session state: failed.`;
  if (rtc.packetLoss > 5)
    return `${getPoetryLine('connection_degraded')} Packet loss at ${rtc.packetLoss.toFixed(1)}%.`;
  if (rtc.rtt > 200)
    return `RTT is elevated — ${Math.round(rtc.rtt)}ms. VECTOR is tracking it.`;
  if (rtc.isRelay)
    return `You're relaying through TURN. Direct path not established yet.`;
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Rule-based local response — zero latency, no LLM.
 * Enriched with live RTC context when provided.
 */
export function respondToInput(
  userText: string,
  history: ConversationMessage[],
  mode: VoiceMode = VOICE_MODES.DEFAULT,
  rtcContext?: RTCContext,
): string {
  const lower = userText.toLowerCase().trim();

  // Schema: frustration → calm + redirect
  if (detectFrustrated(userText)) {
    return `${getPoetryLine('user_frustrated_calm')} What specifically isn't working?`;
  }

  // Context-aware: very short follow-up
  const isVeryShort = lower.split(/\s+/).length <= 3;
  const lastAssistant = [...history].reverse().find(m => m.role === 'assistant');
  if (isVeryShort && lastAssistant) {
    if (/^(ok|okay|yes|yeah|sure|go on|continue|more|and|then|what else|tell me more|keep going|please)\.?$/.test(lower)) {
      return getPoetryLine('plan_next_steps');
    }
  }

  // RTC anomaly injection: if system is having issues, proactively report
  if (rtcContext) {
    const anomaly = buildRTCAnomaly(rtcContext);
    if (anomaly && /\b(something|feels|feels off|off|issue|problem|weird|check)\b/i.test(lower)) {
      return anomaly;
    }
  }

  // Pattern matching based on mode
  const patterns = mode === VOICE_MODES.RTC_OPS ? RTC_OPS_PATTERNS : DEFAULT_PATTERNS;
  const match = matchPatterns(lower, patterns);
  if (match) return injectRTCContext(match, rtcContext);

  // Fallback
  return pick(FALLBACK_RESPONSES);
}

/**
 * Wrap a response with persona-level styling.
 * For short responses: leave alone.
 * For confirmations of action: prepend a poetic micro-beat.
 */
export function applyPersona(text: string, key?: keyof typeof import('./poetry').POETRY_BANK): string {
  if (key) {
    const line = getPoetryLine(key);
    return `${line} ${text}`;
  }
  return text;
}

/**
 * Build a prompt string for LLM-backed deployments (ws server fallback).
 */
export function formatPromptWithHistory(
  userText: string,
  history: ConversationMessage[],
  rtcContext?: RTCContext,
): string {
  const rtcBlock = rtcContext
    ? `\n\n[LIVE SYSTEM STATE]
Connection: ${rtcContext.connectionState}
ICE: ${rtcContext.iceState}
Relay: ${rtcContext.isRelay ? 'yes (TURN)' : 'no (direct)'}
Active peers: ${rtcContext.peerCount}
Avg packet loss: ${rtcContext.packetLoss.toFixed(1)}%
Avg RTT: ${Math.round(rtcContext.rtt)}ms`
    : '';

  const historyBlock = history
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Agent Lee'}: ${m.content}`)
    .join('\n');

  return `${SUPERIOR_SYSTEM_PROMPT}${rtcBlock}\n\n${historyBlock}\nUser: ${userText}\nAgent Lee:`;
}
