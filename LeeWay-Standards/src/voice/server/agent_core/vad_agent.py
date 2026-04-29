#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: CORE
# TAG: CORE.SDK.VAD_AGENT.MAIN
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
# WHAT = vad_agent module
# WHY = Part of CORE region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\agent_core\vad_agent.py
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
vad_agent.py – Voice Activity Detection using Silero VAD.

Input:  raw PCM audio frames (16-bit LE, 16 kHz, mono)
Output: SpeechEvent(type="speech_start"|"speech_end", confidence)

Design notes
------------
* Runs synchronously inside an asyncio executor so it never blocks the event loop.
* Tracks a sliding window of VAD probabilities; emits speech_start when the
  probability rises above threshold and speech_end after SILENCE_DURATION of
  silence.  This drives the barge-in signal upstream.
* The agent also exposes `is_speech_active` which the pipeline checks to decide
  whether to interrupt TTS.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Optional

import numpy as np

logger = logging.getLogger(__name__)


class SpeechEventType(str, Enum):
    SPEECH_START = "speech_start"
    SPEECH_END = "speech_end"


@dataclass
class SpeechEvent:
    type: SpeechEventType
    confidence: float = 1.0
    timestamp: float = field(default_factory=time.monotonic)


class VADAgent:
    """Silero-VAD wrapper with speech-start / speech-end event generation."""

    def __init__(
        self,
        threshold: float = 0.5,
        sample_rate: int = 16000,
        window_size_samples: int = 1536,
        silence_duration: float = 0.8,
        on_event: Optional[Callable[[SpeechEvent], None]] = None,
    ) -> None:
        self.threshold = threshold
        self.sample_rate = sample_rate
        self.window_size_samples = window_size_samples
        self.silence_duration = silence_duration
        self.on_event = on_event

        self._model = None
        self._is_speech_active = False
        self._last_speech_time: float = 0.0
        self._buffer = np.array([], dtype=np.float32)
        self._loaded = False

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load the Silero VAD model.  Call once at startup."""
        try:
            import torch

            model, _ = torch.hub.load(
                repo_or_dir="snakers4/silero-vad",
                model="silero_vad",
                trust_repo=True,
            )
            model.eval()
            self._model = model
            self._loaded = True
            logger.info("Silero VAD model loaded.")
        except Exception as exc:
            logger.warning(
                "Silero VAD could not be loaded (%s). Using energy-based fallback.", exc
            )
            self._loaded = False

    @property
    def is_speech_active(self) -> bool:
        return self._is_speech_active

    # ── Processing ────────────────────────────────────────────────────────────

    def process_chunk(self, pcm_bytes: bytes) -> list[SpeechEvent]:
        """
        Feed a raw PCM chunk (16-bit LE, 16 kHz, mono).
        Returns any SpeechEvents generated.
        """
        events: list[SpeechEvent] = []

        # Convert bytes → float32
        audio = np.frombuffer(pcm_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        self._buffer = np.concatenate([self._buffer, audio])

        while len(self._buffer) >= self.window_size_samples:
            window = self._buffer[: self.window_size_samples]
            self._buffer = self._buffer[self.window_size_samples :]
            confidence = self._infer(window)
            ev = self._update_state(confidence)
            if ev:
                events.append(ev)
                if self.on_event:
                    self.on_event(ev)

        return events

    def _infer(self, window: np.ndarray) -> float:
        if self._loaded and self._model is not None:
            try:
                import torch

                tensor = torch.from_numpy(window).unsqueeze(0)
                with torch.no_grad():
                    prob = self._model(tensor, self.sample_rate).item()
                return float(prob)
            except Exception:
                pass
        # Energy-based fallback
        rms = float(np.sqrt(np.mean(window ** 2)))
        # Normalise to 0-1 (empirical: speech RMS ≈ 0.02-0.1 for 16-bit PCM)
        return min(rms / 0.05, 1.0)

    def _update_state(self, confidence: float) -> Optional[SpeechEvent]:
        now = time.monotonic()
        if confidence >= self.threshold:
            self._last_speech_time = now
            if not self._is_speech_active:
                self._is_speech_active = True
                logger.debug("VAD: speech_start (conf=%.2f)", confidence)
                return SpeechEvent(SpeechEventType.SPEECH_START, confidence)
        else:
            if self._is_speech_active:
                silent_for = now - self._last_speech_time
                if silent_for >= self.silence_duration:
                    self._is_speech_active = False
                    logger.debug("VAD: speech_end (silent for %.2fs)", silent_for)
                    return SpeechEvent(SpeechEventType.SPEECH_END, confidence)
        return None

    def reset(self) -> None:
        """Reset state between conversations."""
        self._is_speech_active = False
        self._last_speech_time = 0.0
        self._buffer = np.array([], dtype=np.float32)
