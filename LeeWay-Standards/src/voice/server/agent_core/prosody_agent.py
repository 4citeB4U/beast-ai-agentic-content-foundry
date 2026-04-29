#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.PROSODY_AGENT.MAIN
#
# COLOR_ONION_HEX:
# NEON=#39FF14
# FLUO=#0DFF94
# PASTEL=#C7FFD8
#
# ICON_ASCII:
# family=lucide
# glyph=file
#
# 5WH:
# WHAT = prosody_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\prosody_agent.py
# WHEN = 2026
# HOW = Auto-aligned by LEEWAY align-agent
#
# AGENTS:
# ASSESS
# ALIGN
# AUDIT
#
# LICENSE:
# MIT
#

"""
prosody_agent.py – Converts response text into a prosody plan.

Input:  final response text (str)
Output: ProsodyPlan dict with pace, emphasis words, emotion tag

The prosody plan is consumed by TTSAgent to adjust Piper's synthesis
or to generate SSML-like markup.

This runs locally and fast (pure Python heuristics + optional leeway tags).
If leeway was used for the response and returned prosody tags in a
structured way, those take priority.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ProsodyPlan:
    """Prosody metadata for TTS rendering."""

    pace: float = 1.0  # 0.5 (slow) – 1.5 (fast)
    pitch: float = 0.0  # relative semitones, e.g. +2 or -1
    volume: float = 1.0  # 0.0 – 1.5
    emotion: str = "neutral"  # neutral | warm | excited | calm | serious
    emphasis_words: list[str] = field(default_factory=list)
    pauses: dict[str, float] = field(default_factory=dict)  # word → pause after (s)
    ssml: Optional[str] = None  # pre-built SSML if available


# ── Heuristic rules ──────────────────────────────────────────────────────────

_EXCITED_PATTERNS = [
    r"[!]{1,}",
    r"\b(great|amazing|excellent|fantastic|wow|awesome)\b",
]
_CALM_PATTERNS = [
    r"\b(sorry|apologize|understand|take (your )?time)\b",
]
_SERIOUS_PATTERNS = [
    r"\b(error|fail|warning|danger|critical|urgent|important)\b",
]
_SLOW_PATTERNS = [
    r"\b(carefully|step by step|slowly|one at a time)\b",
]
_FAST_PATTERNS = [
    r"\b(quick(ly)?|fast|brief(ly)?|short)\b",
]

_EXCITED_RE = [re.compile(p, re.IGNORECASE) for p in _EXCITED_PATTERNS]
_CALM_RE = [re.compile(p, re.IGNORECASE) for p in _CALM_PATTERNS]
_SERIOUS_RE = [re.compile(p, re.IGNORECASE) for p in _SERIOUS_PATTERNS]
_SLOW_RE = [re.compile(p, re.IGNORECASE) for p in _SLOW_PATTERNS]
_FAST_RE = [re.compile(p, re.IGNORECASE) for p in _FAST_PATTERNS]


class ProsodyAgent:
    """Analyses text and returns a ProsodyPlan for TTS rendering."""

    def __init__(self) -> None:
        pass

    def plan(self, text: str, leeway_tags: Optional[dict] = None) -> ProsodyPlan:
        """
        Build a ProsodyPlan for the given response text.
        leeway_tags: optional dict from leeway (e.g. {"emotion": "warm", "pace": 0.9})
        """
        plan = ProsodyPlan()

        # If leeway provided structured tags, use them (online only)
        if leeway_tags:
            plan.emotion = leeway_tags.get("emotion", "neutral")
            plan.pace = float(leeway_tags.get("pace", 1.0))
            plan.pitch = float(leeway_tags.get("pitch", 0.0))
            plan.volume = float(leeway_tags.get("volume", 1.0))
            return plan

        # Heuristic analysis
        plan.emotion = self._detect_emotion(text)
        plan.pace = self._detect_pace(text)
        plan.emphasis_words = self._find_emphasis(text)
        plan.pauses = self._find_pauses(text)

        return plan

    # ── Heuristics ────────────────────────────────────────────────────────────

    def _detect_emotion(self, text: str) -> str:
        for pat in _EXCITED_RE:
            if pat.search(text):
                return "excited"
        for pat in _CALM_RE:
            if pat.search(text):
                return "calm"
        for pat in _SERIOUS_RE:
            if pat.search(text):
                return "serious"
        return "neutral"

    def _detect_pace(self, text: str) -> float:
        for pat in _SLOW_RE:
            if pat.search(text):
                return 0.85
        for pat in _FAST_RE:
            if pat.search(text):
                return 1.15
        # Longer sentences → slightly slower
        words = text.split()
        if len(words) > 30:
            return 0.92
        return 1.0

    def _find_emphasis(self, text: str) -> list[str]:
        """Return words in ALL-CAPS or surrounded by * as emphasis hints."""
        caps = re.findall(r"\b[A-Z]{2,}\b", text)
        stars = re.findall(r"\*(\w+)\*", text)
        return list(dict.fromkeys(caps + stars))  # deduplicated, order preserved

    def _find_pauses(self, text: str) -> dict[str, float]:
        """Return {word: pause_after_seconds} for punctuation-driven pauses."""
        pauses: dict[str, float] = {}
        # After sentence-ending punctuation a short pause
        for match in re.finditer(r"(\w+)[.!?]", text):
            pauses[match.group(1)] = 0.3
        # After commas/semicolons a tiny pause
        for match in re.finditer(r"(\w+)[,;]", text):
            pauses[match.group(1)] = 0.15
        return pauses

    def to_ssml(self, text: str, plan: ProsodyPlan) -> str:
        """
        Render a basic SSML string using the prosody plan.
        Piper does not currently support SSML; this is reserved for future use
        or leeway-driven TTS alternatives.
        """
        rate_pct = f"{int(plan.pace * 100)}%"
        pitch_st = f"{plan.pitch:+.1f}st" if plan.pitch != 0 else "0st"
        clean = re.sub(r"[*]", "", text)
        return (
            f'<speak><prosody rate="{rate_pct}" pitch="{pitch_st}">'
            f"{clean}"
            f"</prosody></speak>"
        )

