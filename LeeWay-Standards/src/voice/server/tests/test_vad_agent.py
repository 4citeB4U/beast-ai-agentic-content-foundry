#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: TEST
# TAG: CORE.SDK.TEST_VAD_AGENT.MAIN
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
# WHAT = test_vad_agent module
# WHY = Part of TEST region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\tests\test_vad_agent.py
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
tests/test_vad_agent.py – Unit tests for VADAgent (no Silero model required).
"""
import struct
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from agent_core.vad_agent import VADAgent, SpeechEventType
import numpy as np


def _silence_bytes(n_samples: int) -> bytes:
    return struct.pack(f"<{n_samples}h", *([0] * n_samples))


def _speech_bytes(n_samples: int, amplitude: int = 20000) -> bytes:
    import math
    samples = [
        int(amplitude * math.sin(2 * math.pi * 440 * i / 16000))
        for i in range(n_samples)
    ]
    return struct.pack(f"<{n_samples}h", *samples)


class TestVADAgentInit:
    def test_default_state(self):
        vad = VADAgent()
        assert not vad.is_speech_active

    def test_custom_threshold(self):
        vad = VADAgent(threshold=0.3)
        assert vad.threshold == 0.3

    def test_reset_clears_buffer(self):
        vad = VADAgent()
        # Feed some audio first
        vad.process_chunk(_silence_bytes(1536))
        vad.reset()
        assert not vad.is_speech_active


class TestVADAgentEnergyFallback:
    """Tests using energy-based fallback (no Silero model loaded)."""

    def test_silence_does_not_trigger_speech(self):
        vad = VADAgent(threshold=0.5)
        # Do not call load() to force fallback
        events = []
        for _ in range(5):
            events.extend(vad.process_chunk(_silence_bytes(1536)))
        speech_starts = [e for e in events if e.type == SpeechEventType.SPEECH_START]
        assert len(speech_starts) == 0

    def test_process_chunk_returns_list(self):
        vad = VADAgent(threshold=0.5)
        result = vad.process_chunk(_silence_bytes(1536))
        assert isinstance(result, list)

    def test_empty_chunk_handled(self):
        vad = VADAgent(threshold=0.5)
        result = vad.process_chunk(b"")
        assert result == []


class TestVADAgentSpeechDetection:
    def test_high_energy_triggers_speech_start(self):
        vad = VADAgent(threshold=0.1)  # very low threshold
        events = []
        for _ in range(3):
            events.extend(vad.process_chunk(_speech_bytes(1536, amplitude=25000)))
        speech_starts = [e for e in events if e.type == SpeechEventType.SPEECH_START]
        # Should have detected at least one speech_start
        assert len(speech_starts) >= 1

    def test_speech_end_after_silence(self):
        import time
        vad = VADAgent(threshold=0.1, silence_duration=0.02)
        events = []
        # Trigger speech
        for _ in range(3):
            events.extend(vad.process_chunk(_speech_bytes(1536, amplitude=25000)))
        # Wait for silence_duration to elapse in real time
        time.sleep(0.05)
        # Then send silence chunks
        for _ in range(20):
            events.extend(vad.process_chunk(_silence_bytes(1536)))
        speech_ends = [e for e in events if e.type == SpeechEventType.SPEECH_END]
        assert len(speech_ends) >= 1
