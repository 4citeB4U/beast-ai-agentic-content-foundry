#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.STT_AGENT.MAIN
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
# WHAT = stt_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\stt_agent.py
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
stt_agent.py – Speech-to-Text using faster-whisper.

Input:  audio frames (only when VAD indicates speech)
Output: partial and final transcripts (str + confidence)

Design notes
------------
* Uses faster-whisper's streaming `transcribe` which yields segments as they
  are decoded; we surface those as partial results.
* A separate thread pool is used so the CPU-intensive decode does not block
  the asyncio event loop.
* The agent is cancellable: if an interrupt arrives the current transcription
  is abandoned.
"""
from __future__ import annotations

import asyncio
import io
import logging
import struct
from dataclasses import dataclass
from typing import AsyncIterator, Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class TranscriptChunk:
    text: str
    is_final: bool = False
    confidence: float = 1.0


class STTAgent:
    """faster-whisper based STT with streaming partial results."""

    def __init__(
        self,
        model_name: str = "base.en",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self.model_name = model_name
        self.device = device
        self.compute_type = compute_type
        self._model = None
        self._executor = None

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load the Whisper model.  Call once at startup."""
        try:
            from faster_whisper import WhisperModel

            self._model = WhisperModel(
                self.model_name,
                device=self.device,
                compute_type=self.compute_type,
            )
            logger.info("Whisper model '%s' loaded on %s.", self.model_name, self.device)
        except Exception as exc:
            logger.error("Failed to load Whisper model: %s", exc)
            raise

    # ── Transcription ─────────────────────────────────────────────────────────

    async def transcribe_stream(
        self,
        audio_bytes: bytes,
        sample_rate: int = 16000,
        language: str = "en",
        cancel_event: Optional[asyncio.Event] = None,
    ) -> AsyncIterator[TranscriptChunk]:
        """
        Transcribe a complete utterance (collected after speech_end).
        Yields TranscriptChunk items; the last one has is_final=True.
        """
        if self._model is None:
            raise RuntimeError("STTAgent not loaded. Call load() first.")

        loop = asyncio.get_event_loop()

        # Run blocking transcription in thread pool
        try:
            segments, info = await loop.run_in_executor(
                None,
                lambda: self._model.transcribe(
                    self._bytes_to_np(audio_bytes, sample_rate),
                    language=language,
                    beam_size=5,
                    vad_filter=False,  # VAD handled upstream
                    word_timestamps=False,
                ),
            )
        except Exception as exc:
            logger.error("Whisper transcription error: %s", exc)
            return

        full_text = ""
        for seg in segments:
            if cancel_event and cancel_event.is_set():
                logger.debug("STT cancelled mid-transcription.")
                return
            text = seg.text.strip()
            if not text:
                continue
            full_text += (" " if full_text else "") + text
            # Confidence: avg log_prob from segment
            confidence = min(1.0, max(0.0, 1.0 + (seg.avg_logprob or -1.0)))
            yield TranscriptChunk(text=full_text, is_final=False, confidence=confidence)

        if full_text:
            yield TranscriptChunk(text=full_text, is_final=True, confidence=confidence)

    # ── Utilities ─────────────────────────────────────────────────────────────

    @staticmethod
    def _bytes_to_np(audio_bytes: bytes, sample_rate: int) -> np.ndarray:
        """Convert raw PCM 16-bit LE bytes to float32 numpy array."""
        audio = np.frombuffer(audio_bytes, dtype=np.int16).astype(np.float32)
        return audio / 32768.0
