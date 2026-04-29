#
# LEEWAY HEADER — DO NOT REMOVE
#
# REGION: TEST
# TAG: CORE.SDK.TEST_WEBSOCKET_PROTOCOL.MAIN
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
# WHAT = test_websocket_protocol module
# WHY = Part of TEST region
# WHO = LEEWAY Align Agent
# WHERE = voice\server\tests\test_websocket_protocol.py
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
tests/test_websocket_protocol.py – Unit tests for protocol helpers.
"""
import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from websocket_protocol import (
    AgentState,
    RouteMode,
    make_error,
    make_final_response,
    make_final_transcript,
    make_partial_response,
    make_partial_transcript,
    make_state,
    HelloEvent,
    StateEvent,
    ErrorEvent,
)


class TestMakeHelpers:
    def test_make_state_listening(self):
        msg = make_state(AgentState.LISTENING)
        assert msg["type"] == "state"
        assert msg["state"] == "listening"

    def test_make_state_speaking(self):
        msg = make_state(AgentState.SPEAKING)
        assert msg["state"] == "speaking"

    def test_make_partial_transcript(self):
        msg = make_partial_transcript("hello", 0.9)
        assert msg["type"] == "partial_transcript"
        assert msg["text"] == "hello"
        assert msg["confidence"] == 0.9

    def test_make_final_transcript(self):
        msg = make_final_transcript("hello world", 0.95)
        assert msg["type"] == "final_transcript"
        assert msg["text"] == "hello world"

    def test_make_partial_response(self):
        msg = make_partial_response("tok", 3)
        assert msg["type"] == "partial_response_text"
        assert msg["text"] == "tok"
        assert msg["token_index"] == 3

    def test_make_final_response_local(self):
        msg = make_final_response("done", RouteMode.LOCAL)
        assert msg["type"] == "final_response_text"
        assert msg["route"] == "local"

    def test_make_final_response_leeway(self):
        msg = make_final_response("done", RouteMode.leeway)
        assert msg["route"] == "leeway"

    def test_make_error(self):
        msg = make_error("stt_error", "Whisper failed")
        assert msg["type"] == "error"
        assert msg["code"] == "stt_error"
        assert "Whisper" in msg["message"]


class TestEventModels:
    def test_hello_event_defaults(self):
        e = HelloEvent()
        assert e.type == "hello"
        assert e.version == "1"
        assert e.sample_rate == 16000

    def test_hello_event_custom(self):
        e = HelloEvent(capabilities=["vad"], sample_rate=48000)
        assert "vad" in e.capabilities
        assert e.sample_rate == 48000

    def test_error_event(self):
        e = ErrorEvent(code="test", message="msg")
        assert e.type == "error"

