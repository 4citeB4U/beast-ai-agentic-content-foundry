#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.LEEWAY_HEAVY_BRAIN_AGENT.MAIN
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
# WHAT = leeway_heavy_brain_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\leeway_heavy_brain_agent.py
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
leeway_heavy_brain_agent.py – leeway Live SDK integration for heavy tasks.

Only called by the pipeline when:
  * RouterAgent returns mode="leeway"
  * OFFLINE_MODE is not set
  * leeway_API_KEY is available

Streams tokens back to the caller via an async generator.
Cancellable: pass an asyncio.Event; the generator will stop cleanly.

Context is intentionally kept short (curated by MemoryAgent) to minimise
token usage and stay near the free tier.
"""
from __future__ import annotations

import asyncio
import logging
from typing import AsyncIterator, Optional

logger = logging.getLogger(__name__)

_SYSTEM_INSTRUCTION = (
    "You are Agent Lee, a concise and helpful voice assistant. "
    "Give direct, spoken-English answers. No markdown, no bullet points. "
    "Keep responses under 100 words unless the user explicitly asks for detail."
)


class leewayHeavyBrainAgent:
    """leeway API wrapper – streaming, cancellable."""

    def __init__(self, api_key: str, model: str = "leeway-1.5-flash") -> None:
        self.api_key = api_key
        self.model = model
        self._client = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Initialise the leeway client."""
        if not self.api_key:
            logger.warning("leewayHeavyBrainAgent: no API key – disabled.")
            return
        try:
            import leeway.generativeai as genai

            genai.configure(api_key=self.api_key)
            self._client = genai.GenerativeModel(
                model_name=self.model,
                system_instruction=_SYSTEM_INSTRUCTION,
            )
            logger.info("leewayHeavyBrainAgent: ready (model=%s).", self.model)
        except Exception as exc:
            logger.error("leewayHeavyBrainAgent: init failed: %s", exc)

    @property
    def is_available(self) -> bool:
        return self._client is not None

    # ── Generation ────────────────────────────────────────────────────────────

    async def generate_stream(
        self,
        user_text: str,
        context: str = "",
        history: Optional[list[dict]] = None,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[str]:
        """
        Stream response tokens from leeway.
        `context` is the short memory snippet injected before the user query.
        """
        if not self.is_available:
            yield "I'm sorry, the leeway service is not available right now."
            return

        prompt_parts = []
        if context:
            prompt_parts.append(f"[Context]\n{context}\n\n")
        prompt_parts.append(user_text)
        full_prompt = "".join(prompt_parts)

        leeway_history = self._convert_history(history or [])

        loop = asyncio.get_event_loop()
        queue: asyncio.Queue[Optional[str]] = asyncio.Queue()

        def _run() -> None:
            try:
                chat = self._client.start_chat(history=leeway_history)
                response = chat.send_message(full_prompt, stream=True)
                for chunk in response:
                    text = chunk.text if hasattr(chunk, "text") else ""
                    if text:
                        asyncio.run_coroutine_threadsafe(queue.put(text), loop)
            except Exception as exc:
                logger.error("leeway generation error: %s", exc)
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(None), loop)

        loop.run_in_executor(None, _run)

        while True:
            if cancel_event and cancel_event.is_set():
                logger.debug("leewayHeavyBrainAgent: generation cancelled.")
                break
            try:
                chunk = await asyncio.wait_for(queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            if chunk is None:
                break
            yield chunk

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _convert_history(history: list[dict]) -> list[dict]:
        """Convert our internal history format to leeway's format."""
        leeway_history = []
        for turn in history:
            role = "user" if turn.get("role") == "user" else "model"
            leeway_history.append({"role": role, "parts": [turn.get("content", "")]})
        return leeway_history

