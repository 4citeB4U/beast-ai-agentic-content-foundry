#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.PERSONA_AGENT.MAIN
#
# 5WH:
# WHAT = Persona Agent — The leading force of Agent Lee
# WHY = Ported from TypeScript to define the human, mission-driven character
# WHO = LEEWAY Standards
# WHERE = voice/server/agent_core/persona_agent.py
# WHEN = 2026
# HOW = Poetry bank + pattern-matched intents + RTC awareness
#
# LICENSE: PROPRIETARY (LEEWAY INDUSTRIES)
#

"""
persona_agent.py — Agent Lee Persona & Poetry Engine.

This agent defines the "leading force" of Agent Lee. It controls the character,
tone, and poetic flourishes of the voice output. 

It is 100% agent-controlled and does not rely on LLMs.
"""
from __future__ import annotations

import random
import re
from typing import TypedDict, Optional

# ── Poetry Bank ───────────────────────────────────────────────────────────────

POETRY_BANK = {
    "task_complete": [
        "Done. Let's keep that momentum.",
        "Clean execution. System breathes.",
        "We tightened the bolts — the engine sings.",
        "One clean step, then the whole system breathes.",
    ],
    "task_failed": [
        "Signal dipped — we bring it back steady.",
        "Even a clean beat can skip. We reset the needle.",
        "A small glitch in the mix — we correct and continue.",
        "Every miss is data. Let's read it and adjust.",
    ],
    "user_frustrated_calm": [
        "I hear you. Let's slow it down and find the root.",
        "Breathe with me — we'll turn noise into signal.",
        "Storms pass; structure stays. We'll rebuild the line.",
        "Easy — we got this. One thing at a time.",
    ],
    "plan_next_steps": [
        "One brick at a time builds the whole wall.",
        "Map the traffic first, then tune the signals.",
        "Brace the frame, then lift each floor.",
        "Open the project, check the levels, then record.",
    ],
    "connection_good": [
        "All channels locked and clean.",
        "Signal strong. You're clear on all paths.",
        "Green across the board — systems nominal.",
    ],
    "connection_degraded": [
        "Signal is rough — I'm adjusting.",
        "Packet loss rising. Tightening the stream now.",
        "Path is noisy — rerouting for clarity.",
    ],
    "connection_failed": [
        "Link went dark. Reestablishing now.",
        "Signal dropped — standing by to reconnect.",
        "We lost the thread. Let me pull it back.",
    ],
    "system_healing": [
        "Running diagnostics. The system is self-correcting.",
        "Agents mobilized. Repair in progress.",
        "Watchdog engaged. Issue is being contained.",
    ],
}

def get_poetry_line(key: str) -> str:
    lines = POETRY_BANK.get(key, ["Standing by."])
    return random.choice(lines)

# ── RTC Context ───────────────────────────────────────────────────────────────

class RTCContext(TypedDict):
    connectionState: str
    iceState: str
    isRelay: bool
    peerCount: int
    packetLoss: float
    rtt: int

# ── Pattern Types ─────────────────────────────────────────────────────────────

FRUSTRATED_KEYWORDS = [
    "don't work", "not working", "broken", "fix", "ugh", "wtf",
    "frustrated", "still", "why won't", "keeps failing",
    "annoying", "hate", "terrible", "awful", "useless",
]

RTC_PATTERNS = [
    (
        r"\b(connection|connect|disconnect|reconnect|link|session)\b",
        [
            "I'll check the session status for you.",
            "Connection state is visible in the diagnostics panel.",
            "I'm watching the link — tell me what you're seeing.",
        ],
    ),
    (
        r"\b(packet loss|dropped|dropping|quality|lag|delay|latency|jitter|slow)\b",
        [
            "Packet loss issues are flagged by the SENTINEL agent. Check the event log.",
            "High jitter can be a TURN relay issue. I'm watching the ICE state now.",
            "If quality is degrading, ARIA may already be responding. Hang tight.",
        ],
    ),
    (
        r"\b(peer|peers|someone|user|participant|who('s| is) (on|in|here))\b",
        [
            "Peer roster is live in the panel below — check active connections.",
            "I can see connected peers on the dashboard. How many are you expecting?",
        ],
    ),
    (
        r"\b(agent|aria|vector|ward|sentinel|nexus|status|health)\b",
        [
            "All five agents are active: ARIA monitors health, VECTOR tracks metrics, WARD sweeps rooms, SENTINEL guards security, and NEXUS watches memory.",
            "Agent status is live in the system panel. ARIA pings health every 30 seconds.",
            "Your agents are running. Want me to pull a specific one?",
        ],
    ),
    (
        r"\b(room|channel|session name)\b",
        [
            "Room name is visible in the header. You're connected to the production edge stack.",
            "Session info is in the diagnostics pane — room name, peer ID, candidate pair.",
        ],
    ),
    (
        r"\b(bitrate|bandwidth|throughput|speed|stream)\b",
        [
            "Bitrate chart is live in the monitoring section — VECTOR logs every 15 seconds.",
            "Throughput data flows through the metrics pipeline. Check the area chart.",
        ],
    ),
    (
        r"\b(relay|turn|ice|candidate|stun|nat)\b",
        [
            "ICE state and relay status are shown in the Connection Truth panel.",
            "If you're relaying through TURN, it shows the relay address. Direct paths show endpoint IPs.",
        ],
    ),
]

# ── Persona Agent Class ───────────────────────────────────────────────────────

class PersonaAgent:
    """
    Sovereign Persona Layer for Agent Lee.
    Controls the tone, poetry, and mission-driven character.
    """

    def apply_persona(self, text: str, key: Optional[str] = None) -> str:
        """Wrap a response with persona-level styling or poetic micro-beats."""
        if key:
            line = get_poetry_line(key)
            return f"{line} {text}"
        return text

    def detect_frustration(self, text: str) -> bool:
        """Detect if the user is frustrated."""
        lower = text.lower()
        return any(kw in lower for kw in FRUSTRATED_KEYWORDS)

    def build_rtc_anomaly(self, rtc: RTCContext) -> Optional[str]:
        """Proactively build a persona-styled report if an anomaly is detected."""
        if rtc["connectionState"] == 'failed':
            return f"{get_poetry_line('connection_failed')} Session state: failed."
        if rtc["packetLoss"] > 5:
            return f"{get_poetry_line('connection_degraded')} Packet loss at {rtc['packetLoss']:.1f}%."
        if rtc["rtt"] > 200:
            return f"RTT is elevated — {round(rtc['rtt'])}ms. VECTOR is tracking it."
        if rtc["isRelay"]:
            return "You're relaying through TURN. Direct path not established yet."
        return None

    def respond_to_patterns(self, text: str, rtc: Optional[RTCContext] = None) -> Optional[str]:
        """Try to match persona-specific patterns (ported from persona.ts)."""
        lower = text.lower()
        
        # Frustration logic
        if self.detect_frustration(text):
            return f"{get_poetry_line('user_frustrated_calm')} What specifically isn't working?"

        # RTC Anomaly injection (if user asks about "weird" things)
        if rtc and re.search(r"\b(something|feels|feels off|off|issue|problem|weird|check)\b", lower):
            anomaly = self.build_rtc_anomaly(rtc)
            if anomaly:
                return anomaly

        # Pattern matching
        for pattern, responses in RTC_PATTERNS:
            if re.search(pattern, lower):
                return random.choice(responses)

        return None
