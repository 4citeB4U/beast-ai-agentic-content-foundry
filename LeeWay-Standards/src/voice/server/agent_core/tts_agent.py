#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.TTS_AGENT.MAIN
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
# WHAT = tts_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\tts_agent.py
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
tts_agent.py – Text-to-Speech using Piper (local, fast, consistent voice).

Input:  streaming text tokens + ProsodyPlan
Output: streaming PCM audio chunks (16-bit LE)

Design notes
------------
* Piper is invoked as a subprocess; audio is read from its stdout.
* We buffer incoming tokens into sentences/clauses and synthesise each
  independently so the first audio chunk can be emitted quickly (< 400 ms
  after the first sentence is complete).
* The agent is immediately stoppable: kill the Piper subprocess.
* The prosody plan adjusts the text sent to Piper (pace tag is not yet
  supported by Piper CLI; reserved for future integration).
"""
from __future__ import annotations

import asyncio
import logging
import re
import shutil
import struct
import subprocess
import sys
from typing import AsyncIterator, Optional

from .prosody_agent import ProsodyPlan

logger = logging.getLogger(__name__)

# Sentence boundary split pattern
_SENTENCE_RE = re.compile(r"(?<=[.!?;])\s+")

# Chunk size for reading Piper stdout (bytes)
_READ_CHUNK = 4096


class TTSAgent:
    """Piper-based TTS agent with streaming and interruption support."""

    def __init__(
        self,
        piper_executable: str = "piper",
        model_path: str = "./piper_models/en_US-lessac-medium.onnx",
        sample_rate: int = 22050,
    ) -> None:
        self.piper_executable = piper_executable
        self.model_path = model_path
        self.sample_rate = sample_rate
        self._current_process: Optional[asyncio.subprocess.Process] = None

    # ── Availability check ────────────────────────────────────────────────────

    def is_available(self) -> bool:
        """Return True if piper binary is on PATH and model file exists."""
        import os

        exe = shutil.which(self.piper_executable) or self.piper_executable
        return os.path.isfile(self.model_path) and bool(shutil.which(exe))

    # ── Synthesis ─────────────────────────────────────────────────────────────

    async def synthesise_stream(
        self,
        text_stream: AsyncIterator[str],
        prosody: Optional[ProsodyPlan] = None,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[bytes]:
        """
        Consume a streaming text generator and yield PCM audio chunks.
        Yields audio as soon as each sentence is ready.
        """
        sentence_buf = ""

        async for token in text_stream:
            if cancel_event and cancel_event.is_set():
                await self._kill_current()
                return

            sentence_buf += token
            # Flush at sentence boundaries
            parts = _SENTENCE_RE.split(sentence_buf)
            for sentence in parts[:-1]:
                sentence = sentence.strip()
                if sentence:
                    async for chunk in self._synth_sentence(sentence, cancel_event):
                        yield chunk
                        if cancel_event and cancel_event.is_set():
                            await self._kill_current()
                            return
            sentence_buf = parts[-1]

        # Flush remaining buffer
        if sentence_buf.strip():
            async for chunk in self._synth_sentence(sentence_buf.strip(), cancel_event):
                yield chunk

    async def synthesise_text(
        self,
        text: str,
        prosody: Optional[ProsodyPlan] = None,
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[bytes]:
        """Synthesise a complete text string (non-streaming input)."""

        async def _single_token():
            yield text

        async for chunk in self.synthesise_stream(_single_token(), prosody, cancel_event):
            yield chunk

    # ── Internal ──────────────────────────────────────────────────────────────

    async def _synth_sentence(
        self, sentence: str, cancel_event: Optional[asyncio.Event] = None
    ) -> AsyncIterator[bytes]:
        """Run Piper on a single sentence and yield raw PCM bytes."""
        if not self.is_available():
            logger.warning("Piper not available; yielding silence placeholder.")
            yield self._silence(0.3)
            return

        cmd = [
            self.piper_executable,
            "--model", self.model_path,
            "--output-raw",
        ]
        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            self._current_process = proc

            # Write sentence to Piper stdin
            assert proc.stdin is not None
            proc.stdin.write(sentence.encode("utf-8") + b"\n")
            proc.stdin.close()

            # Stream stdout
            assert proc.stdout is not None
            while True:
                if cancel_event and cancel_event.is_set():
                    proc.kill()
                    return
                chunk = await proc.stdout.read(_READ_CHUNK)
                if not chunk:
                    break
                yield chunk

            await proc.wait()
        except FileNotFoundError:
            logger.error("Piper binary not found at '%s'.", self.piper_executable)
            yield self._silence(0.3)
        except Exception as exc:
            logger.error("TTS synthesis error: %s", exc)
        finally:
            self._current_process = None

    async def _kill_current(self) -> None:
        """Kill the currently running Piper process (for barge-in)."""
        if self._current_process is not None:
            try:
                self._current_process.kill()
                logger.debug("TTSAgent: Piper process killed (barge-in).")
            except ProcessLookupError:
                pass
            self._current_process = None

    @staticmethod
    def _silence(seconds: float, sample_rate: int = 22050) -> bytes:
        """Generate silence as PCM 16-bit LE bytes."""
        n_samples = int(sample_rate * seconds)
        return struct.pack(f"<{n_samples}h", *([0] * n_samples))
