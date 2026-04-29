#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.ROUTER_AGENT.MAIN
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
# WHAT = router_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\router_agent.py
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
router_agent.py – Decides whether to use the local LLM or escalate to leeway.

Input:  transcript text + conversation state
Output: RouteDecision {mode: "local"|"leeway", reason, confidence}

Design notes
------------
* Stage 1 – Rule-based fast path (always runs, O(1)):
    Keywords/patterns that definitely belong to local or leeway.
* Stage 2 – Heuristic fallback (word count + query complexity).
* The agent NEVER calls leeway in offline mode.
* Confidence < threshold → escalate to leeway (when online).
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RouteDecision:
    mode: str  # "local" | "leeway"
    reason: str
    confidence: float  # 0.0 – 1.0


# ── Keyword rules ─────────────────────────────────────────────────────────────

_LOCAL_PATTERNS = [
    r"\b(hi|hello|hey|thanks?|thank you|bye|goodbye|yes|no|ok(ay)?)\b",
    r"\bwhat (time|day|date) is it\b",
    r"\brepeat\b",
    r"\bstop\b",
    r"\bpause\b",
    r"\bcancel\b",
    r"\bconfirm\b",
    r"\bremind me\b",
]

_leeway_PATTERNS = [
    r"\b(write|draft|generate|create|compose)\b.{10,}",  # creative / long
    r"\b(explain|summarize|analyse|analyze|research)\b.{15,}",
    r"\b(code|program|script|function|class|algorithm)\b",
    r"\b(translate|translate to)\b",
    r"\b(what (is|are|does|do|did|was|were)).{30,}",  # long factual
]

_LOCAL_RE = [re.compile(p, re.IGNORECASE) for p in _LOCAL_PATTERNS]
_leeway_RE = [re.compile(p, re.IGNORECASE) for p in _leeway_PATTERNS]


class RouterAgent:
    """Fast routing agent that keeps leeway usage minimal."""

    def __init__(
        self,
        leeway_threshold: float = 0.6,
        offline_mode: bool = False,
    ) -> None:
        self.leeway_threshold = leeway_threshold
        self.offline_mode = offline_mode

    def route(
        self,
        transcript: str,
        conversation_turns: int = 0,
        low_confidence_stt: bool = False,
    ) -> RouteDecision:
        """
        Return a RouteDecision synchronously (must be fast < 50 ms).
        """
        text = transcript.strip()

        # ── Clarifying question for very short / low-confidence STT ──────────
        if low_confidence_stt or len(text) < 3:
            return RouteDecision(
                mode="local",
                reason="low_stt_confidence_clarify",
                confidence=0.95,
            )

        # ── Stage 1: rule-based ───────────────────────────────────────────────
        for pat in _LOCAL_RE:
            if pat.search(text):
                return RouteDecision(
                    mode="local",
                    reason="rule_local_match",
                    confidence=0.9,
                )


        # ── Heuristic fallback: word count + question complexity ──────────
        words = text.split()
        if len(words) <= 8:
            return RouteDecision(
                mode="local",
                reason="heuristic_short_query",
                confidence=0.75,
            )

        # All routes resolve to local (hive mind handles everything)
        return RouteDecision(
            mode="local",
            reason="hive_mind_default",
            confidence=0.85,
        )
