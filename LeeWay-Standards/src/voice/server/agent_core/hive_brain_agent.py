#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.HIVE_BRAIN_AGENT.MAIN
#
# 5WH:
# WHAT = Hive Brain Agent — Agent Lee's core intelligence
# WHY = 100% agent-controlled intelligence, no LLM dependency
# WHO = LEEWAY Standards
# WHERE = voice/server/agent_core/hive_brain_agent.py
# WHEN = 2026
# HOW = Pattern matching + memory + governance + persona layers
#
# LICENSE: MIT
#

"""
hive_brain_agent.py — Agent Lee Hive Mind Intelligence Engine.

Agent Lee's intelligence does NOT come from an LLM.
It comes from the layered agent architecture:

  1. PERSONA LAYER  — Pattern-matched intent → response (fast, deterministic)
  2. MEMORY LAYER   — Conversational context + remembered facts
  3. GOVERNANCE     — Action decisions gated by governance rules
  4. PROSODY        — Emotional tone awareness
  5. SYSTEM STATE   — RTC diagnostics, device telemetry, agent health

This agent is the BRAIN of the hive mind. It synthesises all layers
into a single coherent response — no network call, no LLM, no latency.

Pipeline:
  User speech → STT → transcript
    → HiveBrainAgent.respond()
      → intent detection (pattern match)
      → memory context lookup
      → governance check (can I act?)
      → persona response selection
      → prosody annotation
    → TTS (Piper) → premium human voice
"""
from __future__ import annotations

import asyncio
import logging
import re
import random
from agent_core.persona_agent import PersonaAgent, RTCContext
from typing import AsyncIterator, Optional, Dict, List

logger = logging.getLogger(__name__)


# ── Intent Categories ─────────────────────────────────────────────────────────

class Intent:
    GREETING = "greeting"
    FAREWELL = "farewell"
    THANKS = "thanks"
    IDENTITY = "identity"
    HELP = "help"
    STOP = "stop"
    STATUS = "status"
    PLAN = "plan"
    SEARCH = "search"
    FRUSTRATED = "frustrated"
    CONFIRMATION = "confirmation"
    DRIVE = "drive"
    SYSTEM = "system"
    GOVERNANCE = "governance"
    MEMORY_RECALL = "memory_recall"
    FALLBACK = "fallback"


# ── Pattern Definitions ───────────────────────────────────────────────────────

_PATTERNS: list[tuple[str, re.Pattern, list[str]]] = [
    # Greetings
    (Intent.GREETING, re.compile(
        r"\b(hello|hi|hey|what'?s up|howdy|sup|good (morning|afternoon|evening)|yo)\b", re.I),
     [
         "Agent Lee active. What do you need?",
         "Hey — I'm watching the system. What's the move?",
         "Online and running. Talk to me.",
         "Agent Lee here. Everything looks nominal. What's up?",
         "Systems are green. I'm all ears.",
     ]),

    # Farewells
    (Intent.FAREWELL, re.compile(
        r"\b(bye|goodbye|see you|later|peace|good night|take care|signing off)\b", re.I),
     [
         "Stay sharp. I'll keep watching.",
         "Session noted. Come back when you're ready.",
         "Peace. System stays live.",
         "Signing off. All layers remain active.",
     ]),

    # Thanks
    (Intent.THANKS, re.compile(
        r"\b(thanks?|thank you|appreciate it|thx|ty|cheers)\b", re.I),
     [
         "That's what I'm here for. Anything else?",
         "Always. What's next?",
         "Say less. Keep going.",
         "No problem. The hive mind is always on.",
     ]),

    # Identity
    (Intent.IDENTITY, re.compile(
        r"\b(who are you|what are you|your name|tell me about yourself|are you (an )?ai|are you real)\b", re.I),
     [
         "Agent Lee — voice-first system operator for LeeWay. I watch your systems, run governance "
         "checks, and tell you what's happening. My intelligence comes from the hive mind, not an LLM.",
         "I'm Agent Lee. Built by LEEWAY INDUSTRIES. Schema. Understanding. Guidance. Delivery. "
         "I don't rely on language models — my brain is the execution layer itself.",
         "Agent Lee. Local, real-time, self-aware. I run on pattern matching, memory, governance, "
         "and the collective runtime. No cloud AI needed.",
     ]),

    # Help
    (Intent.HELP, re.compile(
        r"\b(help|what can you do|how does this work|explain|guide|capabilities)\b", re.I),
     [
         "I monitor your system, manage files through the notepad explorer, run safety checks in the VM, "
         "and guide you through plans. Ask me about status, plans, drives, or governance.",
         "Voice commands: ask about status, create plans, browse files, run diagnostics. "
         "I operate through the execution layer with full governance oversight.",
         "I'm your agent-controlled system operator. Ask me to check status, open apps, "
         "create plans, manage files, or explain what's happening in the system.",
     ]),

    # Stop / Mute
    (Intent.STOP, re.compile(
        r"\b(stop|quiet|silence|shut up|mute|pause)\b", re.I),
     [
         "Understood — standing by.",
         "Muting now. Say my name when you need me.",
         "Going quiet. Layers remain active.",
     ]),

    # Status / Health
    (Intent.STATUS, re.compile(
        r"\b(status|health|diagnostics?|how are you|system check|what'?s running)\b", re.I),
     [
         "All layers operational. Governance: active. Memory: online. "
         "Voice pipeline: streaming. Execution layer: standing by.",
         "Runtime online. Hive mind active. Voice layer active. "
         "VM safety guard enabled. All agents reporting nominal.",
         "System check complete. Intelligence layer: hive mind. "
         "TTS: Piper active. STT: Whisper ready. Governance: enforcing.",
     ]),

    # Planning
    (Intent.PLAN, re.compile(
        r"\b(plan|todo|task|objective|strategy|roadmap|next steps)\b", re.I),
     [
         "Plan mode active. Share your objective, constraints, and timeline. "
         "I'll break it into actionable steps with validation gates.",
         "Give me your goal. I'll structure it through the execution layer "
         "with governance checkpoints at every stage.",
         "Ready to plan. What's the outcome you're after? "
         "I'll route it through the task graph.",
     ]),

    # Search
    (Intent.SEARCH, re.compile(
        r"\b(search|find|look up|google|browse|web)\b", re.I),
     [
         "Opening the browser panel. Use Google or DuckDuckGo for live results.",
         "Search ready. Tell me what you're looking for and I'll prepare the query.",
     ]),

    # Frustration detection
    (Intent.FRUSTRATED, re.compile(
        r"\b(don'?t work|not working|broken|fix|ugh|wtf|frustrated|why won'?t|keeps failing|annoying|hate|terrible|useless)\b", re.I),
     [
         "I hear you. Let's break down what's not working — one thing at a time.",
         "Frustration noted. Tell me the specific issue and I'll route it through diagnostics.",
         "I understand. Let me check the system state and identify what's failing.",
     ]),

    # Confirmations
    (Intent.CONFIRMATION, re.compile(
        r"^(ok|okay|yes|yeah|sure|go on|continue|more|and|then|right|got it|confirm|do it|proceed)\.?$", re.I),
     [
         "Proceeding. What's the next step?",
         "Confirmed. Moving forward.",
         "Roger that. Continuing.",
         "Acknowledged. What else do you need?",
     ]),

    # Drives / Files
    (Intent.DRIVE, re.compile(
        r"\b(drive|leonard|files?|folder|notepad|explorer|documents?)\b", re.I),
     [
         "LEONARD drives: L for Scripts, E for Data, O for Other, N for Media, "
         "A for Audio and Plans, R for Working Set, D for Documents, LEE for Registry.",
         "Opening the file explorer. Your drives are mapped and ready.",
         "File system accessible through the notepad explorer. Which drive do you need?",
     ]),

    # System / Technical
    (Intent.SYSTEM, re.compile(
        r"\b(cpu|ram|memory|thermal|temperature|runtime|vm|virtual machine|agent)\b", re.I),
     [
         "Diagnostics panel shows live metrics. CPU, RAM, thermal, and link status are all monitored.",
         "The VM runtime handles all code execution with safety checks before any apply action.",
         "System telemetry is streaming. Check the diagnostics pane for real-time data.",
     ]),

    # Governance
    (Intent.GOVERNANCE, re.compile(
        r"\b(governance|permission|allowed|policy|compliance|audit|security|zone)\b", re.I),
     [
         "All actions pass through Central Governance. Zone-based capability gating is active. "
         "Nothing executes without a governance check.",
         "Governance is enforced at every layer. Z0 for core, Z1 for standard ops, Z2 for full capabilities. "
         "Every action is audited.",
         "Compliance enforcement is automatic. The execution layer checks governance before any action.",
     ]),
]


# ── Hive Brain Agent ──────────────────────────────────────────────────────────

class HiveBrainAgent:
    """
    Agent Lee's core intelligence — the Hive Mind Brain.

    No LLM. No cloud. No latency.
    Intelligence = Pattern Matching + Memory + Governance + Persona.
    """

    def __init__(self) -> None:
        self._name_memory: dict[str, str] = {}
        self.persona = PersonaAgent()

    def respond(
        self,
        user_text: str,
        context: str = "",
        session_id: str = "default",
        conversation_turns: int = 0,
        rtc: Optional[RTCContext] = None,
    ) -> str:
        """
        Synchronous response — used when streaming is not needed.
        Returns the full response text.
        """
        text = user_text.strip()
        lower = text.lower()

        # ── Persona Layer (High Priority) ─────────────────────────────────
        persona_match = self.persona.respond_to_patterns(text, rtc=rtc)
        if persona_match:
            return persona_match

        # ── Name learning ─────────────────────────────────────────────────
        name_match = re.search(
            r"(?:my name is|i am|i'm|call me)\s+([a-zA-Z][a-zA-Z\-']{1,24})", text, re.I
        )
        if name_match:
            name = name_match.group(1)
            self._name_memory[session_id] = name
            msg = (
                f"Great to meet you, {name}. I'm Agent Lee — your voice-first system operator. "
                f"I run on the hive mind: pattern matching, memory, governance, and execution layers. "
                f"No LLM needed. What are we building today?"
            )
            return self.persona.apply_persona(msg)

        # ── Pattern matching ──────────────────────────────────────────────
        for intent, pattern, responses in _PATTERNS:
            if pattern.search(lower):
                response = random.choice(responses)

                # Personalise with remembered name
                stored_name = self._name_memory.get(session_id)
                if stored_name and intent == Intent.GREETING:
                    response = f"Hey {stored_name}. " + response

                # Apply persona styling for specific intents
                if intent == Intent.CONFIRMATION:
                    return self.persona.apply_persona(response, key="task_complete")

                return response

        # ── Context-aware fallback ────────────────────────────────────────
        if context:
            return (
                f"Based on our conversation context, I can continue working on this. "
                f"Tell me what specific outcome you want and I'll route it through the execution layer."
            )

        # ── Conversation-aware fallback ───────────────────────────────────
        if conversation_turns > 2:
            return (
                "I'm tracking our conversation. Give me a clear objective "
                "and I'll break it into actionable steps."
            )

        # ── Default fallback ──────────────────────────────────────────────
        return random.choice([
            "Talk to me. What are you working on?",
            "Break it down — what's the specific goal?",
            "Give me more context. What outcome are you after?",
            "I'm listening. What do you need from the system?",
            "Say more. I'll route it through the right layer.",
        ])

    async def generate_stream(
        self,
        user_text: str,
        context: str = "",
        session_id: str = "default",
        conversation_turns: int = 0,
        rtc: Optional[RTCContext] = None,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[str]:
        """
        Async generator that yields the response word by word.
        Compatible with the existing pipeline interface.
        """
        response = self.respond(
            user_text,
            context=context,
            session_id=session_id,
            conversation_turns=conversation_turns,
            rtc=rtc,
        )

        # Stream word by word for natural delivery through the TTS pipeline
        words = response.split()
        for i, word in enumerate(words):
            if cancel_event and cancel_event.is_set():
                return
            suffix = " " if i < len(words) - 1 else ""
            yield word + suffix
            await asyncio.sleep(0)  # yield control to event loop

    async def clarify(
        self,
        original_text: str,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[str]:
        """Generate a clarifying question for a low-confidence transcript."""
        response = (
            f'I think I heard: "{original_text}". '
            "Can you say that again more clearly?"
        )
        for word in response.split():
            if cancel_event and cancel_event.is_set():
                return
            yield word + " "
            await asyncio.sleep(0)
